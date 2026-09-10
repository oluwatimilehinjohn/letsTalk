const Room = require("../../models/Rooms");
const Message = require("../../models/Message");
const DirectConversation = require("../../models/DirectConversation");
const DirectMessage = require("../../models/DirectMessage");
// Resolve current access and deletion state at processing time, not from client input.
async function recipients(event) {
  const data = event.data;
  if (event.eventType === "direct_message.created") {
    const message = await DirectMessage.exists({ _id: data.messageId, conversationId: data.conversationId, senderId: data.actorUserId, isDeleted: false });
    if (!message) return [];
    const conversation = await DirectConversation.exists({ _id: data.conversationId, isArchived: false, "participants.userId": data.recipientUserId });
    return conversation ? [data.recipientUserId] : [];
  }
  const message = await Message.findOne({ _id: data.messageId, roomId: data.roomId, isDeleted: false }).select("createdAt").lean();
  if (!message) return [];
  const room = await Room.findOne({ _id: data.roomId, isArchived: false }).select("members").lean();
  return (room?.members || []).filter(member => String(member.userId) !== data.actorUserId && member.joinedAt <= message.createdAt)
    .map(member => String(member.userId));
}
module.exports = { recipients };
