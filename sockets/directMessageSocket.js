const joinDirectConversation = require(
  "./handlers/direct/joinDirectConversation"
);

const leaveDirectConversation = require(
  "./handlers/direct/leaveDirectConversation"
);

const sendDirectMessage = require(
  "./handlers/direct/sendDirectMessage"
);

const markDirectConversationRead = require(
  "./handlers/direct/markDirectConversationRead"
);

const directTyping = require(
  "./handlers/direct/directTyping"
);

const getDirectPresence = require(
  "./handlers/direct/getDirectPresence"
);

const {
  emitPresenceToContacts,
  registerPresenceSocket,
  unregisterPresenceSocket,
} = require(
  "./services/presenceService"
);

const {
  getSocketUserId,
} = require(
  "./services/socketAuth"
);

function registerDirectMessageSocket(
  io,
  socket
) {
  const userId =
    getSocketUserId(
      socket
    );

  if (!userId) {
    return;
  }

  const presenceResult =
    registerPresenceSocket(
      socket.id,
      userId
    );

  if (
    presenceResult.becameOnline
  ) {
    emitPresenceToContacts(
      io,
      userId,
      true
    ).catch((error) => {
      console.error(
        "Online presence broadcast error:",
        error
      );
    });
  }

  socket.on(
    "joinDirectConversation",
    joinDirectConversation(
      socket
    )
  );

  socket.on(
    "leaveDirectConversation",
    leaveDirectConversation(
      socket
    )
  );

  socket.on(
    "sendDirectMessage",
    sendDirectMessage(
      io,
      socket
    )
  );

  socket.on(
    "markDirectConversationRead",
    markDirectConversationRead(
      io,
      socket
    )
  );

  socket.on(
    "directTypingStart",
    directTyping(
      socket,
      "directTypingStart"
    )
  );

  socket.on(
    "directTypingStop",
    directTyping(
      socket,
      "directTypingStop"
    )
  );

  socket.on(
    "getDirectPresence",
    getDirectPresence(
      socket
    )
  );

  socket.on(
    "disconnect",
    () => {
      const disconnectResult =
        unregisterPresenceSocket(
          socket.id
        );

      if (
        !disconnectResult
          .becameOffline ||
        !disconnectResult.userId
      ) {
        return;
      }

      emitPresenceToContacts(
        io,
        disconnectResult.userId,
        false
      ).catch((error) => {
        console.error(
          "Offline presence broadcast error:",
          error
        );
      });
    }
  );
}

module.exports =
  registerDirectMessageSocket;