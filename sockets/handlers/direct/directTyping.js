const {
  getConversationForUser,
} = require(
  "../../../services/directMessageService"
);

const {
  getDirectChannel,
} = require(
  "../../services/directChannel"
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

function directTyping(
  socket,
  outgoingEventName
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

      const conversation =
        await getConversationForUser(
          conversationId,
          userId
        );

      const channel =
        getDirectChannel(
          conversation._id
        );

      await socket.join(
        channel
      );

      socket
        .to(channel)
        .emit(
          outgoingEventName,
          {
            conversationId:
              String(
                conversation._id
              ),

            userId:
              String(userId),
          }
        );

      acknowledge(
        callback,
        {
          ok: true,

          conversationId:
            String(
              conversation._id
            ),
        }
      );
    } catch (error) {
      console.error(
        `${outgoingEventName} error:`,
        error
      );

      acknowledge(
        callback,
        {
          ok: false,

          error:
            error.message ||
            "Unable to update the typing state.",
        }
      );
    }
  };
}

module.exports =
  directTyping;