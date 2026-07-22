require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");

const connectDB = require("./config/db");
const Message = require("./models/Message");
const formatMessage = require("./utils/messages");

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve files inside the public folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "letsTalk Bot";
const MESSAGE_HISTORY_LIMIT = 100;

// Convert a MongoDB message into the format expected by the frontend
function serializeMessage(message) {
  return formatMessage(
    message.username,
    message.text,
    message.createdAt,
    message._id.toString()
  );
}

// Run whenever a client connects
io.on("connection", (socket) => {
  /*
   * Join a chat room
   */
  socket.on("joinRoom", async ({ username, room }) => {
    try {
      const cleanUsername =
        typeof username === "string" ? username.trim() : "";

      const cleanRoom =
        typeof room === "string" ? room.trim() : "";

      if (!cleanUsername || !cleanRoom) {
        socket.emit(
          "message",
          formatMessage(
            botName,
            "A valid username and room are required."
          )
        );

        return;
      }

      const user = userJoin(
        socket.id,
        cleanUsername,
        cleanRoom
      );

      socket.join(user.room);

      /*
       * Get the latest 100 messages.
       *
       * We fetch newest first so MongoDB can apply the limit,
       * then reverse them before sending to the browser.
       */
      const storedMessages = await Message.find({
        room: user.room,
      })
        .sort({ createdAt: -1 })
        .limit(MESSAGE_HISTORY_LIMIT)
        .lean();

      const messageHistory = storedMessages
        .reverse()
        .map(serializeMessage);

      // Send previous room messages only to the user who joined
      socket.emit("messageHistory", messageHistory);

      // Welcome the current user
      socket.emit(
        "message",
        formatMessage(botName, "Welcome to letsTalk!")
      );

      // Tell other users in the room
      socket.broadcast
        .to(user.room)
        .emit(
          "message",
          formatMessage(
            botName,
            `${user.username} has joined the chat`
          )
        );

      // Update the member list
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    } catch (error) {
      console.error("Join room error:", error);

      socket.emit(
        "message",
        formatMessage(
          botName,
          "Unable to load this room. Please refresh and try again."
        )
      );
    }
  });

  /*
   * Receive and permanently save a message
   */
  socket.on("chatMessage", async (msg) => {
    try {
      const user = getCurrentUser(socket.id);

      if (!user) {
        socket.emit(
          "message",
          formatMessage(
            botName,
            "You must join a room before sending messages."
          )
        );

        return;
      }

      if (typeof msg !== "string") {
        return;
      }

      const cleanMessage = msg.trim();

      if (!cleanMessage) {
        return;
      }

      if (cleanMessage.length > 1000) {
        socket.emit(
          "message",
          formatMessage(
            botName,
            "Messages cannot be longer than 1,000 characters."
          )
        );

        return;
      }

      // Save the message before broadcasting it
      const savedMessage = await Message.create({
        username: user.username,
        room: user.room,
        text: cleanMessage,
      });

      io.to(user.room).emit(
        "message",
        serializeMessage(savedMessage)
      );
    } catch (error) {
      console.error("Message save error:", error);

      socket.emit(
        "message",
        formatMessage(
          botName,
          "Your message could not be saved. Please try again."
        )
      );
    }
  });

  /*
   * Remove the temporary online user when disconnected
   */
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (!user) {
      return;
    }

    io.to(user.room).emit(
      "message",
      formatMessage(
        botName,
        `${user.username} has left the chat`
      )
    );

    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();