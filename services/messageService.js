const Message = require("../models/Message");
const Room = require("../models/Rooms");
const eventBus = require("../events/eventBus");
async function createRoomMessage({ roomId, userId, text, replyTo = null }) {
  // Recheck membership: a socket may remain open after removal or room archival.
  if (!await Room.exists({ _id: roomId, isArchived: false, "members.userId": userId })) {
    throw Object.assign(new Error("You cannot send messages to this room."), { status: 403 });
  }
  const message = await Message.create({ roomId, userId, text, replyTo, reactions: [] });
  await eventBus.publish("message.created", { actorUserId: userId, roomId, messageId: message._id });
  await Room.updateOne({ _id: roomId }, { $set: { lastMessageId: message._id, lastMessageAt: message.createdAt } });
  return message;
}
module.exports = { createRoomMessage };
