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
const userRouter = require(
  "./routes/userRoutes"
);

const socketAuth = require("./middleware/socketAuth");
const registerChatSocket = require("./sockets/chatSocket");

const User = require("./models/User");
const Message = require("./models/Message");

/*
 * Create the Express application,
 * HTTP server and Socket.IO server.
 */
const app = express();
const server = http.createServer(app);
const io = new Server(server);

/*
 * General configuration
 */
const PORT = process.env.PORT || 3000;

const isProduction =
  process.env.NODE_ENV === "production";

const publicDirectory = path.join(
  __dirname,
  "public"
);

/*
 * Render and other hosting platforms
 * usually place the application behind a proxy.
 */
if (isProduction) {
  app.set("trust proxy", 1);
}

/*
 * Parse JSON and form submissions.
 */
app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "10kb",
  })
);

/*
 * Create and register the shared
 * Express session middleware.
 */
const sessionMiddleware =
  createSessionMiddleware();

app.use(sessionMiddleware);

/*
 * API routes
 */
app.use(
  "/api/auth",
  createAuthRouter(io)
);

app.use(
  "/api/profile",
  profileRouter
);

app.use(
  "/api/users",
  userRouter
);

/*
 * Protected and public page routes
 */
app.use(createPageRouter());

/*
 * Public CSS, JavaScript and image files
 */
app.use(
  express.static(publicDirectory)
);

/*
 * Share the Express session with Socket.IO.
 */
io.engine.use(sessionMiddleware);

/*
 * Authenticate every Socket.IO connection.
 */
io.use(socketAuth);

/*
 * Register room and message socket events.
 */
registerChatSocket(io);

/*
 * Optional health-check endpoint.
 */
app.get("/health", (request, response) => {
  response.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/*
 * Handle unknown API endpoints.
 */
app.use("/api", (request, response) => {
  response.status(404).json({
    error: "API endpoint not found.",
  });
});

/*
 * Start the application only after
 * MongoDB connects successfully.
 */
async function startServer() {
  try {
    await connectDB();

    /*
     * Ensure MongoDB indexes are ready.
     */
    await User.init();
    await Message.init();

    server.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Server running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Application startup failed:",
      error
    );

    process.exit(1);
  }
}

startServer();