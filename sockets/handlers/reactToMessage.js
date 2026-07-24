const mongoose = require("mongoose");

const Message = require(
  "../../models/Message"
);

const {
  getCurrentUser,
} = require("../../utils/users");

const {
  ALLOWED_REACTIONS,
} = require("../../config/chat");

const {
  serializeReactions,
} = require(
  "../services/messageSerializer"
);

function getCallback(callback) {
  return typeof callback === "function"
    ? callback
    : () => {};
}

function toggleUserReaction(
  reaction,
  userId
) {
  const hasReacted =
    reaction.userIds.some(
      (id) =>
        id.toString() === userId
    );

  if (hasReacted) {
    reaction.userIds =
      reaction.userIds.filter(
        (id) =>
          id.toString() !== userId
      );

    return;
  }

  reaction.userIds.push(userId);
}

function reactToMessage(io, socket) {
  return async (
    payload = {},
    callback
  ) => {
    const respond =
      getCallback(callback);

    try {
      const roomUser =
        getCurrentUser(socket.id);

      const authenticatedUser =
        socket.data.authenticatedUser;

      if (!roomUser) {
        throw new Error(
          "Join a room before reacting."
        );
      }

      const {
        messageId,
        emoji,
      } = payload;

      if (
        !mongoose.isValidObjectId(
          messageId
        )
      ) {
        throw new Error(
          "Invalid message."
        );
      }

      if (
        !ALLOWED_REACTIONS.has(emoji)
      ) {
        throw new Error(
          "That reaction is not supported."
        );
      }

      const message =
        await Message.findOne({
          _id: messageId,
          room: roomUser.room,
        });

      if (!message) {
        throw new Error(
          "Message not found in this room."
        );
      }

      let reaction =
        message.reactions.find(
          (item) =>
            item.emoji === emoji
        );

      if (!reaction) {
        message.reactions.push({
          emoji,

          userIds: [
            authenticatedUser.id,
          ],
        });
      } else {
        toggleUserReaction(
          reaction,
          authenticatedUser.id
        );
      }

      message.reactions =
        message.reactions.filter(
          (item) =>
            item.userIds.length > 0
        );

      await message.save();

      const reactions =
        serializeReactions(
          message.reactions
        );

      io.to(roomUser.room).emit(
        "messageReactionUpdated",
        {
          messageId:
            message._id.toString(),

          reactions,
        }
      );

      respond({
        ok: true,
        reactions,
      });
    } catch (error) {
      console.error(
        "Reaction error:",
        error
      );

      respond({
        ok: false,

        error:
          error.message ||
          "Unable to update reaction.",
      });
    }
  };
}

module.exports = reactToMessage;