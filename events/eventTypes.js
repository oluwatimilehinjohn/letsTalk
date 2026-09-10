// Version 1 carries identifiers only, never chat text or user credentials.
const schemas = Object.freeze({
  "user.created": ["actorUserId"],
  "message.created": ["actorUserId", "messageId", "roomId"],
  "direct_message.created": ["actorUserId", "messageId", "conversationId", "recipientUserId"],
  "message.deleted": ["actorUserId", "messageId", "roomId"],
  "message.moderator_deleted": ["actorUserId", "messageId", "roomId"],
  "room.created": ["actorUserId", "roomId"],
  "room.archived": ["actorUserId", "roomId"],
  "room.member.joined": ["actorUserId", "roomId"],
  "room.member.removed": ["actorUserId", "roomId", "targetUserId"],
  "member.role.changed": ["actorUserId", "roomId", "targetUserId", "role"],
  "ownership.transferred": ["actorUserId", "roomId", "targetUserId"],
});
const auditTypes = new Set(["room.created", "room.archived", "room.member.joined", "room.member.removed", "member.role.changed", "ownership.transferred", "message.moderator_deleted"]);
module.exports = { schemas, auditTypes };
