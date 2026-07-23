const mongoose = require("mongoose");

const Message = require(
  "../../models/Message"
);

const {
  getCurrentUser,
} = require("../../utils/users");

const {
  populateMessage,
} = require(
  "../services/messagePopulation"
);

const {
  serializeMessage,
} = require(
  "../services/messageSerializer"
);

function getCallback(callback) {
  return typeof callback === "function"
    ? callback
    : () => {};
}

function getMessageText(payload) {
  if (typeof payload === "string") {
    return payload;
  }

  return payload?.text;
}

async function validateReply(
  replyToId,
  room
) {
  if (!replyToId) {
    return null;
  }

  if (
    !mongoose.isValidObjectId(
      replyToId
    )
  ) {
    throw new Error(
      "The selected reply is invalid."
    );
  }

  const replyTarget =
    await Message.findOne({
      _id: replyToId,
      room,
    })
      .select("_id")
      .lean();

  if (!replyTarget) {
    throw new Error(
      "The original message could not be found."
    );
  }

  return replyTarget._id;
}

function sendMessage(io, socket) {
  return async (
    payload,
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
          "Join a room before sending messages."
        );
      }

      const rawText =
        getMessageText(payload);

      if (typeof rawText !== "string") {
        throw new Error(
          "Enter a valid message."
        );
      }

      const text = rawText.trim();

      if (!text) {
        throw new Error(
          "The message cannot be empty."
        );
      }

      if (text.length > 1000) {
        throw new Error(
          "Messages cannot exceed 1,000 characters."
        );
      }

      const replyTo =
        await validateReply(
          payload?.replyToId,
          roomUser.room
        );

      const message =
        await Message.create({
          userId:
            authenticatedUser.id,

          username:
            authenticatedUser.username,

          room: roomUser.room,

          text,

          replyTo,
        });

      await populateMessage(message);

      io.to(roomUser.room).emit(
        "message",
        serializeMessage(message)
      );

      respond({
        ok: true,
        messageId:
          message._id.toString(),
      });
    } catch (error) {
      console.error(
        "Message save error:",
        error
      );

      respond({
        ok: false,

        error:
          error.message ||
          "Your message could not be saved.",
      });
    }
  };
}

module.exports = sendMessage;