const User = require(
  "../../models/User"
);

const {
  userLeave,
  getRoomUsers,
  isUserOnline,
} = require("../../utils/users");

function updateLastSeen(userId) {
  return User.findByIdAndUpdate(
    userId,
    {
      lastSeenAt: new Date(),
    }
  );
}

function disconnectUser(io, socket) {
  return () => {
    const roomUser =
      userLeave(socket.id);

    const authenticatedUser =
      socket.data.authenticatedUser;

    if (
      authenticatedUser &&
      !isUserOnline(
        authenticatedUser.id
      )
    ) {
      updateLastSeen(
        authenticatedUser.id
      ).catch((error) => {
        console.error(
          "Last seen update error:",
          error
        );
      });
    }

    if (!roomUser) {
      return;
    }

    io.to(roomUser.room).emit(
      "roomUsers",
      {
        room: roomUser.room,

        users: getRoomUsers(
          roomUser.room
        ),
      }
    );
  };
}

module.exports = disconnectUser;