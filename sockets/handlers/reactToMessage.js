const mongoose = require(
  "mongoose"
);

const Message = require(
  "../../models/Message"
);

const {
  ALLOWED_REACTIONS,
} = require(
  "../../config/chat"
);

const {
  getCurrentUser,
} = require(
  "../../utils/users"
);

const {
  serializeReactions,
} = require(
  "../services/messageSerializer"
);

function sendAcknowledgement(
  acknowledgement,
  payload
) {
  if (
    typeof acknowledgement ===
    "function"
  ) {
    acknowledgement(payload);
  }
}

function reactToMessage(
  io,
  socket
) {
  return async (
    {
      messageId,
      emoji,
    } = {},
    acknowledgement
  ) => {
    try {
      const user =
        getCurrentUser(
          socket.id
        );

      if (!user) {
        sendAcknowledgement(
          acknowledgement,
          {
            ok: false,

            error:
              "Join a room before reacting.",
          }
        );

        return;
      }

      if (
        !mongoose.isValidObjectId(
          messageId
        )
      ) {
        sendAcknowledgement(
          acknowledgement,
          {
            ok: false,

            error:
              "The selected message is invalid.",
          }
        );

        return;
      }

      if (
        !ALLOWED_REACTIONS.has(
          emoji
        )
      ) {
        sendAcknowledgement(
          acknowledgement,
          {
            ok: false,

            error:
              "That reaction is not allowed.",
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
        sendAcknowledgement(
          acknowledgement,
          {
            ok: false,

            error:
              "The message does not belong to this room.",
          }
        );

        return;
      }

      const reactionIndex =
        message.reactions.findIndex(
          (reaction) => {
            return (
              reaction.emoji ===
              emoji
            );
          }
        );

      if (reactionIndex === -1) {
        message.reactions.push({
          emoji,

          userIds: [
            user.userId,
          ],
        });
      } else {
        const reaction =
          message.reactions[
            reactionIndex
          ];

        const userIndex =
          reaction.userIds.findIndex(
            (reactionUserId) => {
              return (
                String(
                  reactionUserId
                ) ===
                String(
                  user.userId
                )
              );
            }
          );

        if (userIndex === -1) {
          reaction.userIds.push(
            user.userId
          );
        } else {
          reaction.userIds.splice(
            userIndex,
            1
          );
        }

        if (
          reaction.userIds.length ===
          0
        ) {
          message.reactions.splice(
            reactionIndex,
            1
          );
        }
      }

      message.markModified(
        "reactions"
      );

      await message.save();

      const result = {
        messageId:
          String(message._id),

        roomId:
          user.roomId,

        reactions:
          serializeReactions(
            message.reactions
          ),
      };

      io.to(
        user.roomChannel
      ).emit(
        "messageReactionUpdated",
        result
      );

      sendAcknowledgement(
        acknowledgement,
        {
          ok: true,

          ...result,
        }
      );
    } catch (error) {
      console.error(
        "React to message error:",
        error
      );

      sendAcknowledgement(
        acknowledgement,
        {
          ok: false,

          error:
            "Unable to update the reaction.",
        }
      );

      socket.emit(
        "reactionError",
        "Unable to update the reaction."
      );
    }
  };
}

module.exports = reactToMessage;