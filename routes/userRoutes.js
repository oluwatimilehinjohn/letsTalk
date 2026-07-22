const express = require("express");

const requireAuthApi = require(
  "../middleware/requireAuthApi"
);

const {
  getPublicUserProfile,
} = require(
  "../controllers/userController"
);

const router = express.Router();

router.use(requireAuthApi);

router.get(
  "/:username",
  getPublicUserProfile
);

module.exports = router;