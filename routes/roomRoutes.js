const express = require("express");

const requireAuthApi = require(
  "../middleware/requireAuthApi"
);

const {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  listRooms,
} = require(
  "../controllers/roomController"
);

const router = express.Router();

router.use(requireAuthApi);

router.get(
  "/",
  listRooms
);

router.post(
  "/",
  createRoom
);

router.post(
  "/:identifier/join",
  joinRoom
);

router.post(
  "/:identifier/leave",
  leaveRoom
);

router.get(
  "/:identifier",
  getRoom
);

module.exports = router;