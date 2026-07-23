const Message = require(
  "../../models/Message"
);

const {
  userJoin,
  userLeave,
  getCurrentUser,
  getRoomUsers,
} = require("../../utils/users");

const {
  ALLOWED_ROOMS,
  MESSAGE_HISTORY_LIMIT,
} = require("../../config/chat");

const {
  MESSAGE_POPULATION,
} = require(
  "../services/messagePopulation"
);

const {
  serializeMessage,
} = require(
  "../services/messageSerializer"
);

const sendWelcomeOnce = require(
  "../services/welcomeService"
);

function emitRoomUsers(io, room) {
  io.to(room).emit("roomUsers", {
    room,
    users: getRoomUsers(room),
  });
}

function leavePreviousRoom(
  io,
  socket,
  previousUser,
  newRoom
) {
  if (
    !previousUser ||
    previousUser.room === newRoom
  ) {
    return;
  }

  socket.leave(previousUser.room);
  userLeave(socket.id);

  emitRoomUsers(
    io,
    previousUser.room
  );
}

function joinRoom(io, socket) {
  return async ({ room } = {}) => {
    try {
      const cleanRoom =
        typeof room === "string"
          ? room.trim()
          : "";

      if (!ALLOWED_ROOMS.has(cleanRoom)) {
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

      leavePreviousRoom(
        io,
        socket,
        previousUser,
        cleanRoom
      );

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

      const messages =
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
            MESSAGE_POPULATION
          )
          .lean();

      socket.emit(
        "messageHistory",
        messages
          .reverse()
          .map(serializeMessage)
      );

      await sendWelcomeOnce(
        socket,
        user.room
      );

      emitRoomUsers(io, user.room);
    } catch (error) {
      console.error(
        "Join room error:",
        error
      );

      const user = userLeave(
        socket.id
      );

      if (user) {
        socket.leave(user.room);
      }

      socket.emit(
        "joinError",
        "Unable to join this room."
      );
    }
  };
}

module.exports = joinRoom;