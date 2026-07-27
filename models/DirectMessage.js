const mongoose = require("mongoose");

const directMessageSchema =
  new mongoose.Schema(
    {
      conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DirectConversation",
        required: true,
        index: true,
      },

      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 4000,
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
    },
    {
      timestamps: true,
    }
  );

directMessageSchema.index({
  conversationId: 1,
  _id: -1,
});

directMessageSchema.index({
  conversationId: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "DirectMessage",
  directMessageSchema
);