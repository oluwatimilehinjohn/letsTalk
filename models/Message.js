const mongoose = require("mongoose");

const reactionSchema =
  new mongoose.Schema(
    {
      emoji: {
        type: String,
        required: true,
        trim: true,
      },

      userIds: {
        type: [
          {
            type:
              mongoose.Schema.Types
                .ObjectId,

            ref: "User",
          },
        ],

        default: [],
      },
    },
    {
      _id: false,
    }
  );

const messageSchema =
  new mongoose.Schema(
    {
      roomId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Room",

        required: true,

        index: true,
      },

      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      text: {
        type: String,

        required: true,

        maxlength: 4000,
      },

      replyTo: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Message",

        default: null,

        index: true,
      },

      reactions: {
        type: [reactionSchema],

        default: [],
      },

      isEdited: {
        type: Boolean,

        default: false,
      },

      editedAt: {
        type: Date,

        default: null,
      },

      isDeleted: {
        type: Boolean,

        default: false,

        index: true,
      },

      deletedAt: {
        type: Date,

        default: null,
      },

      deletedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      deletionType: {
        type: String,

        enum: [
          "self",
          "moderator",
          null,
        ],

        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

messageSchema.index({
  roomId: 1,
  createdAt: -1,
});

messageSchema.index({
  roomId: 1,
  _id: 1,
});

messageSchema.index({
  roomId: 1,
  isDeleted: 1,
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "Message",
    messageSchema
  );