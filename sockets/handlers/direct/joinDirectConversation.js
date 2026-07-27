const {
  getSerializedConversation,
} = require(
  "../../../services/directMessageService"
);

const {
  getDirectChannel,
} = require(
  "../../services/directChannel"
);

const {
  isUserOnline,
} = require(
  "../../services/presenceService"
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

function joinDirectConversation(
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

      const conversation =
        await getSerializedConversation(
          conversationId,
          userId
        );

      const channel =
        getDirectChannel(
          conversation.id
        );

      await socket.join(
        channel
      );

      if (
        !(
          socket.data
            .directConversationIds
          instanceof Set
        )
      ) {
        socket.data
          .directConversationIds =
          new Set();
      }

      socket.data
        .directConversationIds
        .add(
          conversation.id
        );

      const otherUserId =
        conversation.otherUser
          ?.id ||
        null;

      acknowledge(
        callback,
        {
          ok: true,

          conversation,

          presence:
            otherUserId
              ? {
                  userId:
                    otherUserId,

                  isOnline:
                    isUserOnline(
                      otherUserId
                    ),
                }
              : null,
        }
      );
    } catch (error) {
      console.error(
        "Join direct conversation error:",
        error
      );

      acknowledge(
        callback,
        {
          ok: false,

          error:
            error.message ||
            "Unable to join the direct conversation.",
        }
      );
    }
  };
}

module.exports =
  joinDirectConversation;