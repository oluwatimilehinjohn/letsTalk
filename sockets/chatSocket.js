const joinRoom = require(
  "./handlers/joinRoom"
);

const sendMessage = require(
  "./handlers/sendMessage"
);

const reactToMessage = require(
  "./handlers/reactToMessage"
);

const disconnectUser = require(
  "./handlers/disconnectUser"
);

function registerChatSocket(io) {
  io.on(
    "connection",
    (socket) => {
      socket.on(
        "joinRoom",
        joinRoom(
          io,
          socket
        )
      );

      socket.on(
        "chatMessage",
        sendMessage(
          io,
          socket
        )
      );

      socket.on(
        "reactToMessage",
        reactToMessage(
          io,
          socket
        )
      );

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