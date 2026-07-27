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
  getRoomChannel,
} = require(
  "../services/roomChannel"
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
  user
) {
  io.to(user.roomChannel).emit(
    "roomUsers",
    {
      room:
        user.roomName,

      roomId:
        user.roomId,

      roomSlug:
        user.roomSlug,

      users:
        getRoomUsers(
          user.roomId
        ),
    }
  );
}

function leavePreviousRoom(
  io,
  socket,
  previousUser,
  nextRoomId
) {
  if (!previousUser) {
    return;
  }

  if (
    previousUser.roomId ===
    String(nextRoomId)
  ) {
    return;
  }

  socket.leave(
    previousUser.roomChannel
  );

  userLeave(socket.id);

  emitRoomUsers(
    io,
    previousUser
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

      const joinedRoom =
        await ensureRoomMembership(
          roomDocument,
          authenticatedUser.id
        );

      const roomId =
        String(joinedRoom._id);

      const roomChannel =
        getRoomChannel(roomId);

      const previousUser =
        getCurrentUser(
          socket.id
        );

      leavePreviousRoom(
        io,
        socket,
        previousUser,
        roomId
      );

      const user = userJoin({
        socketId:
          socket.id,

        userId:
          authenticatedUser.id,

        username:
          authenticatedUser.username,

        displayName:
          authenticatedUser.displayName,

        avatarUrl:
          authenticatedUser.avatarUrl,

        roomId,

        roomName:
          joinedRoom.name,

        roomSlug:
          joinedRoom.slug,

        roomChannel,
      });

      socket.data.currentRoomId =
        roomId;

      socket.data.currentRoomChannel =
        roomChannel;

      socket.join(
        roomChannel
      );

      const messages =
        await Message.find({
          roomId:
            joinedRoom._id,
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

      const roomContext = {
        id:
          joinedRoom._id,

        name:
          joinedRoom.name,

        slug:
          joinedRoom.slug,
      };

      socket.emit(
        "messageHistory",
        messages
          .reverse()
          .map((message) => {
            return serializeMessage(
              message,
              roomContext
            );
          })
      );

      await sendWelcomeOnce(
        socket,
        roomContext
      );

      emitRoomUsers(
        io,
        user
      );
    } catch (error) {
      console.error(
        "Join room error:",
        error
      );

      const user =
        userLeave(socket.id);

      if (user) {
        socket.leave(
          user.roomChannel
        );
      }

      socket.data.currentRoomId =
        null;

      socket.data.currentRoomChannel =
        null;

      socket.emit(
        "joinError",
        error.message ||
        "Unable to join this room."
      );
    }
  };
}

module.exports = joinRoom;