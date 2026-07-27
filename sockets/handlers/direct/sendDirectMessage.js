const {
  createDirectMessage,
} = require(
  "../../../services/directMessageRealtimeService"
);

const {
  getDirectChannel,
} = require(
  "../../services/directChannel"
);

const {
  emitDirectConversationActivity,
} = require(
  "../../services/directConversationEmitter"
);

const {
  getSocketUserId,
} = require(
  "../../services/socketAuth"
);

function acknowledge(
  callback,
  payload
) {
  if (
    typeof callback ===
    "function"
  ) {
    callback(payload);
  }
}

function sendDirectMessage(
  io,
  socket
) {
  return async (
    {
      conversationId,
      text,
    } = {},
    callback
  ) => {
    try {
      const senderId =
        getSocketUserId(
          socket
        );

      if (!senderId) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "Authentication is required.",
          }
        );

        return;
      }

      const result =
        await createDirectMessage({
          conversationId,

          senderId,

          text,
        });

      const channel =
        getDirectChannel(
          result.message
            .conversationId
        );

      await socket.join(
        channel
      );

      io.to(channel).emit(
        "directMessage",
        result.message
      );

      emitDirectConversationActivity(
        io,
        result.conversation
      );

      acknowledge(
        callback,
        {
          ok: true,

          message:
            result.message,
        }
      );
    } catch (error) {
      console.error(
        "Send direct message error:",
        error
      );

      acknowledge(
        callback,
        {
          ok: false,

          error:
            error.message ||
            "Unable to send the direct message.",

          code:
            error.code ||
            "DIRECT_MESSAGE_ERROR",
        }
      );
    }
  };
}

module.exports =
  sendDirectMessage;