const mongoose = require(
  "mongoose"
);

const {
  getDirectChannel,
} = require(
  "../../services/directChannel"
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

function leaveDirectConversation(
  socket
) {
  return async (
    {
      conversationId,
    } = {},
    callback
  ) => {
    try {
      if (
        !mongoose.isValidObjectId(
          conversationId
        )
      ) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "The conversation ID is invalid.",
          }
        );

        return;
      }

      await socket.leave(
        getDirectChannel(
          conversationId
        )
      );

      socket.data
        .directConversationIds
        ?.delete(
          String(
            conversationId
          )
        );

      acknowledge(
        callback,
        {
          ok: true,

          conversationId:
            String(
              conversationId
            ),
        }
      );
    } catch (error) {
      console.error(
        "Leave direct conversation error:",
        error
      );

      acknowledge(
        callback,
        {
          ok: false,

          error:
            "Unable to leave the direct conversation.",
        }
      );
    }
  };
}

module.exports =
  leaveDirectConversation;