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
  canDeleteMessage,
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

function deleteMessage(
  io,
  socket
) {
  return async (
    {
      messageId,
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
              "Join a room before deleting a message.",
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
            ok: true,

            alreadyDeleted:
              true,
          }
        );

        return;
      }

      const permission =
        await canDeleteMessage(
          message,
          user.userId
        );

      if (
        !permission.allowed
      ) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "You do not have permission to delete this message.",
          }
        );

        return;
      }

      message.isDeleted =
        true;

      message.deletedAt =
        new Date();

      message.deletedBy =
        user.userId;

      message.deletionType =
        permission.deletionType;

      message.reactions = [];

      message.markModified(
        "reactions"
      );

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
        "messageDeleted",
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
        "Delete message error:",
        error
      );

      acknowledge(
        callback,
        {
          ok: false,

          error:
            "Unable to delete the message.",
        }
      );
    }
  };
}

module.exports = deleteMessage;