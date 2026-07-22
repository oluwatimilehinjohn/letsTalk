const express = require("express");

const requireAuthApi = require(
  "../middleware/requireAuthApi"
);

const avatarUpload = require(
  "../middleware/avatarUpload"
);

const {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  removeMyAvatar,
  changeMyPassword,
} = require(
  "../controllers/profileController"
);

const router = express.Router();

router.use(requireAuthApi);

router.get(
  "/",
  getMyProfile
);

router.patch(
  "/",
  updateMyProfile
);

router.post(
  "/avatar",
  avatarUpload,
  uploadMyAvatar
);

router.delete(
  "/avatar",
  removeMyAvatar
);

router.patch(
  "/password",
  changeMyPassword
);

module.exports = router;