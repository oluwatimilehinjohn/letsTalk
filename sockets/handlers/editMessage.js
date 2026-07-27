const mongoose = require(
  "mongoose"
);

const Message = require(
  "../../models/Message"
);

const {
  getCurrentUser,
} = require(
  "../../utils/users"
);

const {
  MESSAGE_POPULATION,
} = require(
  "../services/messagePopulation"
);

const {
  serializeMessage,
} = require(
  "../services/messageSerializer"
);

const {
  isMessageOwner,
} = require(
  "../services/messagePermissionService"
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

function editMessage(
  io,
  socket
) {
  return async (
    {
      messageId,
      text,
    } = {},
    callback
  ) => {
    try {
      const user =
        getCurrentUser(
          socket.id
        );

      if (!user) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "Join a room before editing a message.",
          }
        );

        return;
      }

      if (
        !mongoose.isValidObjectId(
          messageId
        )
      ) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "The selected message is invalid.",
          }
        );

        return;
      }

      const cleanText =
        String(text || "")
          .trim();

      if (!cleanText) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "A message cannot be empty.",
          }
        );

        return;
      }

      if (
        cleanText.length > 4000
      ) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "Messages cannot exceed 4000 characters.",
          }
        );

        return;
      }

      const message =
        await Message.findOne({
          _id:
            messageId,

          roomId:
            user.roomId,
        });

      if (!message) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "The message does not belong to this room.",
          }
        );

        return;
      }

      if (message.isDeleted) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "Deleted messages cannot be edited.",
          }
        );

        return;
      }

      if (
        !isMessageOwner(
          message,
          user.userId
        )
      ) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "You can only edit your own messages.",
          }
        );

        return;
      }

      if (
        message.text ===
        cleanText
      ) {
        acknowledge(
          callback,
          {
            ok: true,

            unchanged: true,
          }
        );

        return;
      }

      message.text =
        cleanText;

      message.isEdited =
        true;

      message.editedAt =
        new Date();

      await message.save();

      await message.populate(
        MESSAGE_POPULATION
      );

      const serializedMessage =
        serializeMessage(
          message,
          {
            id:
              user.roomId,

            name:
              user.roomName,

            slug:
              user.roomSlug,
          }
        );

      io.to(
        user.roomChannel
      ).emit(
        "messageUpdated",
        serializedMessage
      );

      acknowledge(
        callback,
        {
          ok: true,

          message:
            serializedMessage,
        }
      );
    } catch (error) {
      console.error(
        "Edit message error:",
        error
      );

      acknowledge(
        callback,
        {
          ok: false,

          error:
            "Unable to edit the message.",
        }
      );
    }
  };
}

module.exports = editMessage;