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

const {
  getUserChannel,
} = require(
  "./services/userChannel"
);

function registerChatSocket(io) {
  io.on(
    "connection",
    (socket) => {
      const authenticatedUser =
        socket.data
          .authenticatedUser;

      if (
        authenticatedUser?.id
      ) {
        socket.join(
          getUserChannel(
            authenticatedUser.id
          )
        );
      }

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