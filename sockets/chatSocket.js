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
        "editMessage",
        editMessage(
          io,
          socket
        )
      );

      socket.on(
        "deleteMessage",
        deleteMessage(
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