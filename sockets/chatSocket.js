const { socketContext } = require("../utils/requestContext");
const joinRoom = require(
  "./handlers/joinRoom"
);

const sendMessage = require(
  "./handlers/sendMessage"
);

const editMessage = require(
  "./handlers/editMessage"
);

const deleteMessage = require(
  "./handlers/deleteMessage"
);

const reactToMessage = require(
  "./handlers/reactToMessage"
);

const disconnectUser = require(
  "./handlers/disconnectUser"
);

const registerDirectMessageSocket =
  require(
    "./directMessageSocket"
  );

const {
  getUserChannel,
} = require(
  "./services/userChannel"
);

const {
  getSocketUserId,
} = require(
  "./services/socketAuth"
);

const {
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("../utils/users");

function registerChatSocket(io) {
  io.on(
    "connection",
    (socket) => {
      const userId =
        getSocketUserId(
          socket
        );

      if (userId) {
        socket.join(
          getUserChannel(
            userId
          )
        );
      }

      registerDirectMessageSocket(
        io,
        socket
      );

      socket.on(
        "joinRoom",
        socketContext(joinRoom(
          io,
          socket
        ), "joinRoom")
      );

      socket.on(
        "chatMessage",
        socketContext(sendMessage(
          io,
          socket
        ), "chatMessage")
      );

      socket.on(
        "editMessage",
        editMessage(
          io,
          socket
        )
      );

      socket.on(
        "deleteMessage",
        socketContext(deleteMessage(
          io,
          socket
        ), "deleteMessage")
      );

      socket.on(
        "reactToMessage",
        reactToMessage(
          io,
          socket
        )
      );

      socket.on("roomTyping", (payload = {}) => {
        const user = getCurrentUser(socket.id);

        if (!user) {
          return;
        }

        socket.to(user.roomChannel).emit("roomTyping", {
          userId: user.userId,
          displayName: user.displayName || user.username,
          isTyping: Boolean(payload.isTyping),
        });
      });

      // Leaving the live view does not remove persistent room membership.
      socket.on('leaveRoomView', (_, callback) => {
        const user = userLeave(socket.id);
        if (user) {
          socket.leave(user.roomChannel);
          io.to(user.roomChannel).emit('roomUsers', { room: user.roomName, roomId: user.roomId, users: getRoomUsers(user.roomId) });
        }
        socket.data.currentRoomId = null;
        socket.data.currentRoomChannel = null;
        if (typeof callback === 'function') callback({ ok: true });
      });

      socket.on(
        "disconnect",
        disconnectUser(
          io,
          socket
        )
      );
    }
  );
}

module.exports =
  registerChatSocket;
