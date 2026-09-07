const { getConversationForUser } = require("../../../services/directMessageService");
const { getSocketUserId } = require("../../services/socketAuth");
const { getUserChannel } = require("../../services/userChannel");

// Signaling is deliberately separate from WebRTC media. Socket.IO only proves
// both users belong to the same DM and relays short-lived offer/answer/ICE data.
const calls = new Map();
const acknowledge = (callback, payload) => { if (typeof callback === "function") callback(payload); };
const validDescription = description => description && ["offer", "answer"].includes(description.type) && typeof description.sdp === "string" && description.sdp.length < 100000;
const validCandidate = candidate => candidate && typeof candidate.candidate === "string" && candidate.candidate.length < 10000;

async function participants(socket, conversationId) {
  const userId = getSocketUserId(socket);
  if (!userId) throw new Error("Authentication is required.");
  const conversation = await getConversationForUser(conversationId, userId);
  const other = conversation.participants.find(participant => String(participant.userId) !== userId);
  if (!other) throw new Error("The other participant is unavailable.");
  return { conversationId: String(conversation._id), userId, otherUserId: String(other.userId) };
}
function otherParticipant(call, userId) { return call.callerId === userId ? call.recipientId : call.callerId; }
function endCall(io, conversationId, endedBy, reason = "ended") {
  const call = calls.get(conversationId);
  if (!call) return;
  calls.delete(conversationId);
  for (const userId of [call.callerId, call.recipientId]) io.to(getUserChannel(userId)).emit("directCallEnded", { conversationId, endedBy, reason });
}
function registerDirectCallSignaling(io, socket) {
  socket.on("directCallOffer", async ({ conversationId, description, mode } = {}, callback) => {
    try {
      if (!validDescription(description) || description.type !== "offer") throw new Error("The call offer is invalid.");
      const context = await participants(socket, conversationId);
      if (calls.has(context.conversationId)) throw new Error("This person is already in a call.");
      calls.set(context.conversationId, { callerId: context.userId, recipientId: context.otherUserId });
      const user = socket.data.authenticatedUser || {};
      io.to(getUserChannel(context.otherUserId)).emit("directCallOffer", { conversationId: context.conversationId, description, mode: mode === "video" ? "video" : "audio", caller: { id: context.userId, username: user.username || "", displayName: user.displayName || user.username || "" } });
      acknowledge(callback, { ok: true });
    } catch (error) { acknowledge(callback, { ok: false, error: error.message || "Unable to start the call." }); }
  });
  socket.on("directCallAnswer", async ({ conversationId, description } = {}, callback) => {
    try {
      if (!validDescription(description) || description.type !== "answer") throw new Error("The call answer is invalid.");
      const context = await participants(socket, conversationId); const call = calls.get(context.conversationId);
      if (!call || call.recipientId !== context.userId) throw new Error("This call is no longer available.");
      io.to(getUserChannel(call.callerId)).emit("directCallAnswer", { conversationId: context.conversationId, description }); acknowledge(callback, { ok: true });
    } catch (error) { acknowledge(callback, { ok: false, error: error.message || "Unable to answer the call." }); }
  });
  socket.on("directCallIceCandidate", async ({ conversationId, candidate } = {}, callback) => {
    try {
      if (!validCandidate(candidate)) throw new Error("The network candidate is invalid.");
      const context = await participants(socket, conversationId); const call = calls.get(context.conversationId);
      if (!call || ![call.callerId, call.recipientId].includes(context.userId)) throw new Error("This call is no longer available.");
      io.to(getUserChannel(otherParticipant(call, context.userId))).emit("directCallIceCandidate", { conversationId: context.conversationId, candidate }); acknowledge(callback, { ok: true });
    } catch (error) { acknowledge(callback, { ok: false, error: error.message || "Unable to update the call connection." }); }
  });
  socket.on("directCallEnd", async ({ conversationId, reason } = {}, callback) => {
    try {
      const context = await participants(socket, conversationId); const call = calls.get(context.conversationId);
      if (call && [call.callerId, call.recipientId].includes(context.userId)) endCall(io, context.conversationId, context.userId, reason === "declined" ? "declined" : "ended");
      acknowledge(callback, { ok: true });
    } catch (error) { acknowledge(callback, { ok: false, error: error.message || "Unable to end the call." }); }
  });
}
function endCallsForUser(io, userId) { for (const [conversationId, call] of calls) if (call.callerId === String(userId) || call.recipientId === String(userId)) endCall(io, conversationId, String(userId), "disconnected"); }
module.exports = { registerDirectCallSignaling, endCallsForUser };
