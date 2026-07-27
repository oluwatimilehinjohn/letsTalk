const express = require("express");

const requireAuthApi = require(
  "../middleware/requireAuthApi"
);

const {
  getConversation,
  getConversations,
  getMessages,
  markRead,
  openConversation,
  searchUsers,
} = require(
  "../controllers/directMessageController"
);

const router =
  express.Router();

router.use(
  requireAuthApi
);

router.get(
  "/users",
  searchUsers
);

router.get(
  "/conversations",
  getConversations
);

router.post(
  "/conversations/:userId",
  openConversation
);

router.get(
  "/conversations/:conversationId/messages",
  getMessages
);

router.post(
  "/conversations/:conversationId/read",
  markRead
);

router.get(
  "/conversations/:conversationId",
  getConversation
);

module.exports = router;