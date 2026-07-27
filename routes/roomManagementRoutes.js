const express = require(
  "express"
);

const requireAuthApi = require(
  "../middleware/requireAuthApi"
);

const requireRoomRole = require(
  "../middleware/requireRoomRole"
);

const {
  archiveRoom,
  listRoomMembers,
  removeRoomMember,
  transferOwnership,
  updateMemberRole,
  updateRoom,
} = require(
  "../controllers/roomManagementController"
);

const router =
  express.Router();

router.use(
  requireAuthApi
);

router.patch(
  "/:identifier",
  requireRoomRole(
    "owner",
    "admin"
  ),
  updateRoom
);

router.get(
  "/:identifier/members",
  requireRoomRole(
    "owner",
    "admin"
  ),
  listRoomMembers
);

router.patch(
  "/:identifier/members/:userId/role",
  requireRoomRole("owner"),
  updateMemberRole
);

router.delete(
  "/:identifier/members/:userId",
  requireRoomRole(
    "owner",
    "admin"
  ),
  removeRoomMember
);

router.post(
  "/:identifier/transfer-ownership",
  requireRoomRole("owner"),
  transferOwnership
);

router.delete(
  "/:identifier",
  requireRoomRole("owner"),
  archiveRoom
);

module.exports = router;