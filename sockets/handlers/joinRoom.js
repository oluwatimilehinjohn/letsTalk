const Message = require(
  "../../models/Message"
);

const {
  userJoin,
  userLeave,
  getCurrentUser,
  getRoomUsers,
} = require(
  "../../utils/users"
);

const {
  MESSAGE_HISTORY_LIMIT,
} = require(
  "../../config/chat"
);

const {
  ensureRoomMembership,
  findRoomByIdentifier,
} = require(
  "../../services/roomService"
);

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

function emitRoomUsers(
  io,
  roomName
) {
  io.to(roomName).emit(
    "roomUsers",
    {
      room: roomName,

      users:
        getRoomUsers(roomName),
    }
  );
}

function leavePreviousRoom(
  io,
  socket,
  previousUser,
  newRoomName
) {
  if (
    !previousUser ||
    previousUser.room ===
      newRoomName
  ) {
    return;
  }

  socket.leave(
    previousUser.room
  );

  userLeave(socket.id);

  emitRoomUsers(
    io,
    previousUser.room
  );
}

function joinRoom(io, socket) {
  return async ({ room } = {}) => {
    try {
      const authenticatedUser =
        socket.data
          .authenticatedUser;

      const roomDocument =
        await findRoomByIdentifier(
          room
        );

      if (!roomDocument) {
        socket.emit(
          "joinError",
          "That room does not exist."
        );

        return;
      }

      await ensureRoomMembership(
        roomDocument,
        authenticatedUser.id
      );

      const roomName =
        roomDocument.name;

      const previousUser =
        getCurrentUser(socket.id);

      leavePreviousRoom(
        io,
        socket,
        previousUser,
        roomName
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

        room: roomName,
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

      emitRoomUsers(
        io,
        user.room
      );
    } catch (error) {
      console.error(
        "Join room error:",
        error
      );

      const user =
        userLeave(socket.id);

      if (user) {
        socket.leave(user.room);
      }

      socket.emit(
        "joinError",
        error.message ||
          "Unable to join this room."
      );
    }
  };
}

module.exports = joinRoom;