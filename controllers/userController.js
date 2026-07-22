const User = require("../models/User");

const {
  isUserOnline,
} = require("../utils/users");

const USERNAME_PATTERN =
  /^[A-Za-z0-9_]{3,24}$/;

async function getPublicUserProfile(
  request,
  response
) {
  try {
    const username =
      typeof request.params.username ===
      "string"
        ? request.params.username.trim()
        : "";

    if (!USERNAME_PATTERN.test(username)) {
      response.status(400).json({
        error: "Invalid username.",
      });

      return;
    }

    const user = await User.findOne({
      usernameLower:
        username.toLowerCase(),
    }).lean();

    if (!user) {
      response.status(404).json({
        error: "User not found.",
      });

      return;
    }

    const userId =
      user._id.toString();

    response.json({
      user: {
        id: userId,

        username: user.username,

        displayName:
          user.displayName ||
          user.username,

        avatarUrl:
          user.avatarUrl || null,

        bio: user.bio || "",

        online:
          isUserOnline(userId),

        lastSeenAt:
          user.lastSeenAt || null,

        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Public profile error:",
      error
    );

    response.status(500).json({
      error:
        "Unable to load this profile.",
    });
  }
}

module.exports = {
  getPublicUserProfile,
};