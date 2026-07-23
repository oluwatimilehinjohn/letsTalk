const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    emoji: {
      type: String,
      required: true,
    },

    userIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    _id: false,
  }
);

const messageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },

    room: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      index: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
      index: true,
    },

    reactions: {
      type: [reactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({
  room: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Message",
  messageSchema
);