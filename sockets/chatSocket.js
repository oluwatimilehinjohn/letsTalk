const User = require("../models/User");
const Message = require("../models/Message");

const formatMessage = require(
  "../utils/messages"
);

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  isUserOnline,
} = require("../utils/users");

const {
  BOT_NAME,
  MESSAGE_HISTORY_LIMIT,
  ALLOWED_ROOMS,
} = require("../config/chat");

function serializeMessage(message) {
  const populatedAuthor =
    message.userId &&
    typeof message.userId === "object" &&
    message.userId._id
      ? message.userId
      : null;

  const userId = populatedAuthor
    ? populatedAuthor._id.toString()
    : message.userId
      ? message.userId.toString()
      : null;

  return formatMessage(
    message.username,
    message.text,
    message.createdAt,
    message._id.toString(),
    userId,
    {
      displayName:
        populatedAuthor?.displayName ||
        populatedAuthor?.username ||
        message.username,

      avatarUrl:
        populatedAuthor?.avatarUrl ||
        null,
    }
  );
}

function registerChatSocket(io) {
  io.on("connection", (socket) => {
    const sessionId =
      socket.request.session.id;

    socket.join(sessionId);

    socket.on(
      "joinRoom",
      async ({ room } = {}) => {
        try {
          const cleanRoom =
            typeof room === "string"
              ? room.trim()
              : "";

          if (
            !ALLOWED_ROOMS.has(cleanRoom)
          ) {
            socket.emit(
              "joinError",
              "That room does not exist."
            );

            return;
          }

          const authenticatedUser =
            socket.data.authenticatedUser;

          const previousUser =
            getCurrentUser(socket.id);

          if (
            previousUser &&
            previousUser.room !== cleanRoom
          ) {
            socket.leave(
              previousUser.room
            );

            userLeave(socket.id);

            io.to(
              previousUser.room
            ).emit("roomUsers", {
              room: previousUser.room,

              users: getRoomUsers(
                previousUser.room
              ),
            });
          }

          const user = userJoin({
            socketId: socket.id,

            userId:
              authenticatedUser.id,

            username:
              authenticatedUser.username,

            displayName:
              authenticatedUser.displayName,

            avatarUrl:
              authenticatedUser.avatarUrl,

            room: cleanRoom,
          });

          socket.join(user.room);

          const storedMessages =
            await Message.find({
              room: user.room,
            })
              .sort({
                createdAt: -1,
              })
              .limit(
                MESSAGE_HISTORY_LIMIT
              )
              .populate(
                "userId",
                "username displayName avatarUrl"
              )
              .lean();

          const messageHistory =
            storedMessages
              .reverse()
              .map(serializeMessage);

          socket.emit(
            "messageHistory",
            messageHistory
          );

          socket.emit(
            "message",
            formatMessage(
              BOT_NAME,
              "Welcome to letsTalk!"
            )
          );

          socket.broadcast
            .to(user.room)
            .emit(
              "message",
              formatMessage(
                BOT_NAME,
                `${user.displayName} has joined the chat`
              )
            );

          io.to(user.room).emit(
            "roomUsers",
            {
              room: user.room,

              users: getRoomUsers(
                user.room
              ),
            }
          );
        } catch (error) {
          console.error(
            "Join room error:",
            error
          );

          const removedUser =
            userLeave(socket.id);

          if (removedUser) {
            socket.leave(
              removedUser.room
            );
          }

          socket.emit(
            "joinError",
            "Unable to join this room."
          );
        }
      }
    );

    socket.on(
      "chatMessage",
      async (message) => {
        try {
          const user =
            getCurrentUser(socket.id);

          const authenticatedUser =
            socket.data.authenticatedUser;

          if (!user) {
            socket.emit(
              "message",
              formatMessage(
                BOT_NAME,
                "Join a room before sending messages."
              )
            );

            return;
          }

          if (
            typeof message !== "string"
          ) {
            return;
          }

          const cleanMessage =
            message.trim();

          if (!cleanMessage) {
            return;
          }

          if (
            cleanMessage.length > 1000
          ) {
            socket.emit(
              "message",
              formatMessage(
                BOT_NAME,
                "Messages cannot exceed 1,000 characters."
              )
            );

            return;
          }

          const savedMessage =
            await Message.create({
              userId:
                authenticatedUser.id,

              username:
                authenticatedUser.username,

              room: user.room,

              text: cleanMessage,
            });

          await savedMessage.populate(
            "userId",
            "username displayName avatarUrl"
          );

          io.to(user.room).emit(
            "message",
            serializeMessage(savedMessage)
          );
        } catch (error) {
          console.error(
            "Message save error:",
            error
          );

          socket.emit(
            "message",
            formatMessage(
              BOT_NAME,
              "Your message could not be saved."
            )
          );
        }
      }
    );

    socket.on("disconnect", () => {
      const user =
        userLeave(socket.id);

      const authenticatedUser =
        socket.data.authenticatedUser;

      if (
        authenticatedUser &&
        !isUserOnline(
          authenticatedUser.id
        )
      ) {
        User.findByIdAndUpdate(
          authenticatedUser.id,
          {
            lastSeenAt: new Date(),
          }
        ).catch((error) => {
          console.error(
            "Last seen update error:",
            error
          );
        });
      }

      if (!user) {
        return;
      }

      io.to(user.room).emit(
        "message",
        formatMessage(
          BOT_NAME,
          `${user.displayName} has left the chat`
        )
      );

      io.to(user.room).emit(
        "roomUsers",
        {
          room: user.room,

          users: getRoomUsers(
            user.room
          ),
        }
      );
    });
  });
}

module.exports = registerChatSocket;