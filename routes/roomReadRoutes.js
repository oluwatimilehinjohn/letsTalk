const express = require("express");

const requireAuthApi = require(
  "../middleware/requireAuthApi"
);

const {
  getReadSummary,
  getRoomUnread,
  markRoomAsRead,
} = require(
  "../controllers/roomReadController"
);

const router = express.Router();

router.use(requireAuthApi);

router.get(
  "/read-summary",
  getReadSummary
);

router.get(
  "/:identifier/unread",
  getRoomUnread
);

router.post(
  "/:identifier/read",
  markRoomAsRead
);

module.exports = router;