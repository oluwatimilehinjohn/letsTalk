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
  io.on("connection", (socket) => {
    const sessionId =
      socket.request.session.id;

    socket.join(sessionId);

    socket.on(
      "joinRoom",
      joinRoom(io, socket)
    );

    socket.on(
      "chatMessage",
      sendMessage(io, socket)
    );

    socket.on(
      "message:react",
      reactToMessage(io, socket)
    );

    socket.on(
      "disconnect",
      disconnectUser(io, socket)
    );
  });
}

module.exports = registerChatSocket;