const mongoose = require("mongoose");

const roomMemberSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      role: {
        type: String,
        enum: [
          "owner",
          "admin",
          "member",
        ],
        default: "member",
      },

      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: false,
    }
  );

const roomSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50,
      },

      nameLower: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 160,
        default: "",
      },

      visibility: {
        type: String,
        enum: [
          "public",
          "private",
        ],
        default: "public",
        index: true,
      },

      joinPolicy: {
        type: String,
        enum: [
          "open",
          "invite",
        ],
        default: "open",
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      members: {
        type: [roomMemberSchema],
        default: [],
      },

      isSystem: {
        type: Boolean,
        default: false,
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

roomSchema.index({
  visibility: 1,
  isArchived: 1,
  name: 1,
});

roomSchema.index({
  "members.userId": 1,
});

roomSchema.pre(
  "validate",
  function prepareRoom(next) {
    if (this.name) {
      this.name =
        this.name.trim();

      this.nameLower =
        this.name.toLowerCase();
    }

    next();
  }
);

module.exports = mongoose.model(
  "Room",
  roomSchema
);