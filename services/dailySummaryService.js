const DAY = 86400000;
// Nigeria uses UTC+1 year-round. Boundaries are the previous local calendar day.
function previousNigeriaDay(scheduledAt) {
  const time = new Date(scheduledAt).getTime();
  if (!Number.isFinite(time)) throw new TypeError("Invalid digest date");
  const end = new Date(Math.floor((time + 3600000) / DAY) * DAY - 3600000);
  return { start: new Date(end.getTime() - DAY), end,
    date: new Date(end.getTime() - DAY + 3600000).toISOString().slice(0, 10) };
}
function membershipWindow(members, userId, start, end) {
  const member = members.find(item => String(item.userId?._id || item.userId) === String(userId));
  if (!member) return null;
  const since = new Date(Math.max(new Date(start).getTime(), new Date(member.joinedAt).getTime()));
  return since < new Date(end) ? { $gte: since, $lt: new Date(end) } : null;
}
function createSummarySource({ User, Room, Message, DirectConversation, DirectMessage }) {
  return {
    users: (cursor, scheduledAt) => User.find({ createdAt: { $lte: scheduledAt },
      ...(cursor ? { _id: { $gt: cursor } } : {}) }).select("_id").sort({ _id: 1 }).limit(100).lean(),
    user: id => User.findById(id).select("email displayName username").lean(),
    async summary(userId, start, end) {
      const sections = [];
      const rooms = await Room.find({ isArchived: false, "members.userId": userId }).select("name members").lean();
      const conversations = await DirectConversation.find({ isArchived: false, "participants.userId": userId })
        .select("participants").populate("participants.userId", "displayName username").lean();
      async function section(model, filter, title) {
        const count = await model.countDocuments(filter);
        if (!count) return;
        const recent = await model.find(filter).select("text").sort({ createdAt: -1, _id: -1 }).limit(3).lean();
        sections.push({ title, count, previews: recent.reverse().map(message => message.text.slice(0, 180)) });
      }
      for (const room of rooms) {
        const createdAt = membershipWindow(room.members, userId, start, end);
        if (createdAt) await section(Message, { roomId: room._id, isDeleted: false, createdAt }, room.name);
      }
      for (const conversation of conversations) {
        const createdAt = membershipWindow(conversation.participants, userId, start, end);
        const other = conversation.participants.find(p => p.userId && String(p.userId._id) !== String(userId))?.userId;
        if (createdAt) await section(DirectMessage, { conversationId: conversation._id, isDeleted: false, createdAt },
          `Chat with ${other?.displayName || other?.username || "deleted user"}`);
      }
      sections.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
      return { count: sections.reduce((total, item) => total + item.count, 0),
        conversationCount: sections.length, sections: sections.slice(0, 20) };
    },
  };
}
function defaultSummarySource() {
  return createSummarySource({ User: require("../models/User"), Room: require("../models/Rooms"),
    Message: require("../models/Message"), DirectConversation: require("../models/DirectConversation"),
    DirectMessage: require("../models/DirectMessage") });
}
module.exports = { previousNigeriaDay, membershipWindow, createSummarySource, defaultSummarySource };
