require("dotenv").config();

const path = require("path");
const http = require("http");

const express = require("express");

const { Server } = require("socket.io");

const connectDB = require("./config/db");

const createSessionMiddleware = require("./config/session");

const createAuthRouter = require("./routes/authRoutes");

const createPageRouter = require("./routes/pageRoutes");

const profileRouter = require("./routes/profileRoutes");

const userRouter = require("./routes/userRoutes");

const roomRouter = require("./routes/roomRoutes");

const roomReadRouter = require("./routes/roomReadRoutes");

const roomManagementRouter = require("./routes/roomManagementRoutes");

const roomSettingsPageRouter = require("./routes/roomSettingsPageRoutes");

const socketAuth = require("./middleware/socketAuth");

const registerChatSocket = require("./sockets/chatSocket");

const User = require("./models/User");

const Room = require("./models/Rooms");

const Message = require("./models/Message");

const { seedDefaultRooms } = require("./services/roomService");

const directMessageRouter = require("./routes/directMessageRoutes");

const DirectConversation = require("./models/DirectConversation");

const DirectMessage = require("./models/DirectMessage");

const { createLifecycle } = require("./utils/lifecycle");
const { connectPostgres, closePostgres } = require("./config/postgres");
const { requestContext } = require("./utils/requestContext");
const lifecycle = createLifecycle();
const app = express();
app.use(requestContext);

const server = http.createServer(app);

const io = new Server(server);
app.set("io", io);

const PORT = process.env.PORT || 3000;

const isProduction = process.env.NODE_ENV === "production";

const publicDirectory = path.join(__dirname, "public");

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  express.json({
    limit: "10kb",
  }),
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "10kb",
  }),
);

const sessionMiddleware = createSessionMiddleware();

app.use(sessionMiddleware);
lifecycle.add(() => require("mongoose").disconnect());
lifecycle.add(closePostgres);
lifecycle.add(() => sessionMiddleware.close());
app.use("/api/notifications", require("./routes/notificationRoutes"));

app.get("/health", (request, response) => {
  response.status(200).json({
    status: "ok",
  });
});

app.use("/api/auth", createAuthRouter(io));

app.use("/api/profile", profileRouter);

app.use("/api/users", userRouter);

app.use("/api/rooms", roomReadRouter);

app.use("/api/rooms", roomRouter);

app.use("/api/rooms", roomManagementRouter);
/*
 * Register this before the general
 * page router.
 */
app.use(roomSettingsPageRouter);

app.use("/api/direct-messages", directMessageRouter);
app.use("/api/chat", require("./routes/chatExperienceRoutes"));

app.use(createPageRouter());

app.use(express.static(publicDirectory));

io.engine.use(sessionMiddleware);

io.use(socketAuth);

registerChatSocket(io);

app.use("/api", (request, response) => {
  response.status(404).json({
    error: "API route not found.",
  });
});

app.use((error, request, response, next) => {
  require("./utils/logger").failure("http.failed", error, { requestId: request.requestId });

  if (response.headersSent) {
    next(error);
    return;
  }

  if (request.originalUrl.startsWith("/api/")) {
    response.status(500).json({
      error: "An unexpected server error occurred.",
    });

    return;
  }

  response.status(500).send("An unexpected server error occurred.");
});

async function startServer() {
  try {
    await connectDB();

    await connectPostgres();
    if (process.env.EVENTS_ENABLED === "true") await require("./models/DomainOutbox").init();

    await User.init();
    await Room.init();
    await Message.init();
    await DirectConversation.init();
    await DirectMessage.init();

    await seedDefaultRooms();

    lifecycle.add(() => new Promise(resolve => io.close(resolve)));
    lifecycle.signals();
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(PORT, "0.0.0.0", () => {
        server.removeListener("error", reject);
        resolve();
        console.log(`Server running on port ${server.address().port}`);
      });
    });
  } catch (error) {
    require("./utils/logger").failure("application.startup.failed", error);
    await lifecycle.stop(1);
    if (require.main !== module) throw error;
  }
}

if (require.main === module) startServer();
module.exports = { app, io, server, startServer, close: () => lifecycle.close() };
