const mongoose = require("mongoose");

const conversationParticipantSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      joinedAt: {
        type: Date,
        default: Date.now,
      },

      lastReadMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DirectMessage",
        default: null,
      },

      lastReadAt: {
        type: Date,
        default: null,
      },

      unreadCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      _id: false,
    }
  );

const directConversationSchema =
  new mongoose.Schema(
    {
      participantKey: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      participants: {
        type: [conversationParticipantSchema],

        required: true,

        validate: {
          validator(participants) {
            if (
              !Array.isArray(participants) ||
              participants.length !== 2
            ) {
              return false;
            }

            const participantIds =
              participants.map((participant) => {
                return String(participant.userId);
              });

            return (
              new Set(participantIds).size === 2
            );
          },

          message:
            "A direct conversation must contain exactly two different participants.",
        },
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      lastMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DirectMessage",
        default: null,
      },

      lastMessageAt: {
        type: Date,
        default: null,
        index: true,
      },

      lastMessageSenderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      lastMessagePreview: {
        type: String,
        default: "",
        maxlength: 160,
      },

      isArchived: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

directConversationSchema.index({
  "participants.userId": 1,
  isArchived: 1,
  lastMessageAt: -1,
});

directConversationSchema.pre(
  "validate",
  function prepareParticipantKey() {
    if (
      !Array.isArray(this.participants) ||
      this.participants.length !== 2
    ) {
      return;
    }

    const participantIds =
      this.participants
        .map((participant) => {
          return String(participant.userId);
        })
        .sort();

    this.participantKey =
      participantIds.join(":");
  }
);

module.exports = mongoose.model(
  "DirectConversation",
  directConversationSchema
);