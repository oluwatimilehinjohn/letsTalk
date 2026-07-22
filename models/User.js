const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
    },

    usernameLower: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    displayName: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 40,

      default: function setDefaultDisplayName() {
        return this.username;
      },
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    avatarUrl: {
      type: String,
      default: null,
    },

    avatarPublicId: {
      type: String,
      default: null,
      select: false,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },

    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index(
  { usernameLower: 1 },
  { unique: true }
);

userSchema.index(
  { email: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "User",
  userSchema
);