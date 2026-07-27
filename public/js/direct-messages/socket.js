let socket = null;

function waitForSocketConnection() {
  return new Promise(
    (resolve, reject) => {
      if (socket?.connected) {
        resolve();
        return;
      }

      if (!socket) {
        reject(
          new Error(
            "Socket.IO has not been initialized."
          )
        );

        return;
      }

      const timeout =
        window.setTimeout(
          () => {
            cleanup();

            reject(
              new Error(
                "The real-time connection timed out."
              )
            );
          },
          10000
        );

      function cleanup() {
        window.clearTimeout(
          timeout
        );

        socket.off(
          "connect",
          handleConnect
        );

        socket.off(
          "connect_error",
          handleError
        );
      }

      function handleConnect() {
        cleanup();
        resolve();
      }

      function handleError(error) {
        cleanup();

        reject(
          error ||
          new Error(
            "Unable to connect to real-time messaging."
          )
        );
      }

      socket.once(
        "connect",
        handleConnect
      );

      socket.once(
        "connect_error",
        handleError
      );
    }
  );
}

async function emitWithAcknowledgement(
  eventName,
  payload
) {
  await waitForSocketConnection();

  return new Promise(
    (resolve, reject) => {
      const timeout =
        window.setTimeout(
          () => {
            reject(
              new Error(
                "The real-time request timed out."
              )
            );
          },
          10000
        );

      socket.emit(
        eventName,
        payload,
        (result = {}) => {
          window.clearTimeout(
            timeout
          );

          if (
            result.ok === false
          ) {
            reject(
              new Error(
                result.error ||
                "The request failed."
              )
            );

            return;
          }

          resolve(result);
        }
      );
    }
  );
}

export function initializeSocket(
  handlers = {}
) {
  if (
    typeof window.io !==
    "function"
  ) {
    throw new Error(
      "Socket.IO is unavailable."
    );
  }

  socket =
    window.io();

  socket.on(
    "connect",
    () => {
      handlers.onConnect?.(
        socket.id
      );
    }
  );

  socket.on(
    "disconnect",
    (reason) => {
      handlers.onDisconnect?.(
        reason
      );
    }
  );

  socket.on(
    "connect_error",
    (error) => {
      handlers.onConnectionError?.(
        error
      );
    }
  );

  socket.on(
    "directMessage",
    (message) => {
      handlers.onDirectMessage?.(
        message
      );
    }
  );

  socket.on(
    "directConversationActivity",
    (payload) => {
      handlers.onConversationActivity?.(
        payload
      );
    }
  );

  socket.on(
    "directMessageRead",
    (payload) => {
      handlers.onMessageRead?.(
        payload
      );
    }
  );

  socket.on(
    "directTypingStart",
    (payload) => {
      handlers.onTypingStart?.(
        payload
      );
    }
  );

  socket.on(
    "directTypingStop",
    (payload) => {
      handlers.onTypingStop?.(
        payload
      );
    }
  );

  socket.on(
    "directPresenceUpdated",
    (payload) => {
      handlers.onPresenceUpdated?.(
        payload
      );
    }
  );

  return socket;
}

export function joinDirectConversation(
  conversationId
) {
  return emitWithAcknowledgement(
    "joinDirectConversation",
    {
      conversationId,
    }
  );
}

export function leaveDirectConversation(
  conversationId
) {
  return emitWithAcknowledgement(
    "leaveDirectConversation",
    {
      conversationId,
    }
  );
}

export function sendDirectMessage({
  conversationId,
  text,
}) {
  return emitWithAcknowledgement(
    "sendDirectMessage",
    {
      conversationId,
      text,
    }
  );
}

export function markDirectConversationRead(
  conversationId
) {
  return emitWithAcknowledgement(
    "markDirectConversationRead",
    {
      conversationId,
    }
  );
}

export function sendTypingStart(
  conversationId
) {
  return emitWithAcknowledgement(
    "directTypingStart",
    {
      conversationId,
    }
  );
}

export function sendTypingStop(
  conversationId
) {
  return emitWithAcknowledgement(
    "directTypingStop",
    {
      conversationId,
    }
  );
}

export function requestPresence(
  userIds
) {
  return emitWithAcknowledgement(
    "getDirectPresence",
    {
      userIds,
    }
  );
}

export function isSocketConnected() {
  return Boolean(
    socket?.connected
  );
}