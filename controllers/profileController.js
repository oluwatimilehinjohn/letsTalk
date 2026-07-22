const bcrypt = require("bcryptjs");

const User = require("../models/User");

const publicUser = require(
  "../utils/publicUser"
);

const {
  uploadAvatar,
  deleteAvatar,
} = require("../utils/cloudinaryUpload");

async function getMyProfile(
  request,
  response
) {
  try {
    const user = await User.findById(
      request.session.userId
    ).lean();

    if (!user) {
      response.status(404).json({
        error: "Account not found.",
      });

      return;
    }

    response.json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error(
      "Get profile error:",
      error
    );

    response.status(500).json({
      error:
        "Unable to load your profile.",
    });
  }
}

async function updateMyProfile(
  request,
  response
) {
  try {
    const displayName =
      typeof request.body.displayName ===
      "string"
        ? request.body.displayName.trim()
        : "";

    const bio =
      typeof request.body.bio === "string"
        ? request.body.bio.trim()
        : "";

    if (
      displayName.length < 2 ||
      displayName.length > 40
    ) {
      response.status(400).json({
        error:
          "Display name must contain between 2 and 40 characters.",
      });

      return;
    }

    if (bio.length > 160) {
      response.status(400).json({
        error:
          "Bio cannot exceed 160 characters.",
      });

      return;
    }

    const user = await User.findById(
      request.session.userId
    );

    if (!user) {
      response.status(404).json({
        error: "Account not found.",
      });

      return;
    }

    user.displayName = displayName;
    user.bio = bio;

    await user.save();

    response.json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error(
      "Update profile error:",
      error
    );

    response.status(500).json({
      error:
        "Unable to update your profile.",
    });
  }
}

async function uploadMyAvatar(
  request,
  response
) {
  try {
    if (!request.file) {
      response.status(400).json({
        error: "Select an image first.",
      });

      return;
    }

    const user = await User.findById(
      request.session.userId
    ).select("+avatarPublicId");

    if (!user) {
      response.status(404).json({
        error: "Account not found.",
      });

      return;
    }

    const result = await uploadAvatar(
      request.file.buffer,
      user._id.toString()
    );

    user.avatarUrl = result.secure_url;
    user.avatarPublicId =
      result.public_id;

    await user.save();

    response.json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error(
      "Avatar upload error:",
      error
    );

    response.status(500).json({
      error:
        "Unable to upload your avatar.",
    });
  }
}

async function removeMyAvatar(
  request,
  response
) {
  try {
    const user = await User.findById(
      request.session.userId
    ).select("+avatarPublicId");

    if (!user) {
      response.status(404).json({
        error: "Account not found.",
      });

      return;
    }

    if (user.avatarPublicId) {
      await deleteAvatar(
        user.avatarPublicId
      );
    }

    user.avatarUrl = null;
    user.avatarPublicId = null;

    await user.save();

    response.json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error(
      "Remove avatar error:",
      error
    );

    response.status(500).json({
      error:
        "Unable to remove your avatar.",
    });
  }
}

async function changeMyPassword(
  request,
  response
) {
  try {
    const currentPassword =
      typeof request.body
        .currentPassword === "string"
        ? request.body.currentPassword
        : "";

    const newPassword =
      typeof request.body.newPassword ===
      "string"
        ? request.body.newPassword
        : "";

    if (
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      response.status(400).json({
        error:
          "New password must contain between 8 and 72 characters.",
      });

      return;
    }

    const user = await User.findById(
      request.session.userId
    ).select("+passwordHash");

    if (!user) {
      response.status(404).json({
        error: "Account not found.",
      });

      return;
    }

    const passwordMatches =
      await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

    if (!passwordMatches) {
      response.status(401).json({
        error:
          "Your current password is incorrect.",
      });

      return;
    }

    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.passwordHash
      );

    if (samePassword) {
      response.status(400).json({
        error:
          "Choose a different password.",
      });

      return;
    }

    user.passwordHash =
      await bcrypt.hash(
        newPassword,
        12
      );

    await user.save();

    response.status(204).end();
  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    response.status(500).json({
      error:
        "Unable to change your password.",
    });
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  removeMyAvatar,
  changeMyPassword,
};