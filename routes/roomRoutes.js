const express = require(
  "express"
);

const requireAuthApi =
  require(
    "../middleware/requireAuthApi"
  );

const {
  createRoom,
  getRoom,
  joinRoom,
  joinRoomWithCode,
  leaveRoom,
  listRooms,
  regenerateInviteCode,
} = require(
  "../controllers/roomController"
);

const router =
  express.Router();

router.use(
  requireAuthApi
);

router.get(
  "/",
  listRooms
);

router.post(
  "/",
  createRoom
);

router.post(
  "/join-with-code",
  joinRoomWithCode
);

router.post(
  "/:identifier/join",
  joinRoom
);

router.post(
  "/:identifier/invite-code",
  regenerateInviteCode
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