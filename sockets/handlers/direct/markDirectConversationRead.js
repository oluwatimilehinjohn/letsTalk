const {
  markDirectConversationRead,
} = require(
  "../../../services/directMessageRealTimeService"
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

function markDirectConversationReadHandler(
  io,
  socket
) {
  return async (
    {
      conversationId,
    } = {},
    callback
  ) => {
    try {
      const userId =
        getSocketUserId(
          socket
        );

      if (!userId) {
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
        await markDirectConversationRead({
          conversationId,

          userId,
        });

      const channel =
        getDirectChannel(
          conversationId
        );

      await socket.join(
        channel
      );

      io.to(channel).emit(
        "directMessageRead",
        result.readState
      );

      emitDirectConversationActivity(
        io,
        result.conversation
      );

      acknowledge(
        callback,
        {
          ok: true,

          ...result.readState,
        }
      );
    } catch (error) {
      console.error(
        "Mark direct conversation read error:",
        error
      );

      acknowledge(
        callback,
        {
          ok: false,

          error:
            error.message ||
            "Unable to mark the conversation as read.",
        }
      );
    }
  };
}

module.exports =
  markDirectConversationReadHandler;