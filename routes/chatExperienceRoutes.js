const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/requireAuthApi');
const Room = require('../models/Rooms');
const Message = require('../models/Message');
const DirectConversation = require('../models/DirectConversation');
const DirectMessage = require('../models/DirectMessage');
const { MESSAGE_POPULATION } = require('../sockets/services/messagePopulation');
const { serializeMessage } = require('../sockets/services/messageSerializer');
const { serializeDirectMessage } = require('../services/directMessageSerializer');
const router = express.Router();
router.use(requireAuth);

// Read-only additions to the existing models. Every history query is scoped to
// membership; public room discovery does not grant access to message search.
const validId = value => mongoose.isValidObjectId(value);
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
router.get('/search', rateLimit({ windowMs: 60000, limit: 60 }), async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim().slice(0, 100);
    if (query.length < 2) return res.json({ messages: [] });
    const userId = req.session.userId;
    const [rooms, conversations] = await Promise.all([
      Room.find({ 'members.userId': userId, isArchived: false }).select('_id name slug').lean(),
      DirectConversation.find({ 'participants.userId': userId, isArchived: false }).select('_id').lean(),
    ]);
    const pattern = new RegExp(escapeRegex(query), 'i');
    const scope = String(req.query.scope || '');
    const roomIds = rooms.filter(r => !scope || scope === `room:${r._id}`).map(r => r._id);
    const directIds = conversations.filter(c => !scope || scope === `direct:${c._id}`).map(c => c._id);
    const [roomMessages, directMessages] = await Promise.all([
      Message.find({ roomId: { $in: roomIds }, isDeleted: false, text: pattern }).sort({ _id: -1 }).limit(30).populate(MESSAGE_POPULATION).maxTimeMS(5000).lean(),
      DirectMessage.find({ conversationId: { $in: directIds }, isDeleted: false, text: pattern }).sort({ _id: -1 }).limit(30).populate('senderId', 'username displayName avatarUrl').maxTimeMS(5000).lean(),
    ]);
    res.json({ messages: [
      ...roomMessages.map(m => ({ type: 'room', ...serializeMessage(m, rooms.find(r => String(r._id) === String(m.roomId))) })),
      ...directMessages.map(m => ({ type: 'direct', ...serializeDirectMessage(m) })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 40) });
  } catch (error) { next(error); }
});

router.get('/:type/:id/messages', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    if (!['room', 'direct'].includes(type) || !validId(id)) return res.status(400).json({ error: 'Invalid conversation.' });
    const room = type === 'room';
    const parent = await (room ? Room : DirectConversation).findOne({
      _id: id, isArchived: false,
      [room ? 'members.userId' : 'participants.userId']: req.session.userId,
    }).lean();
    if (!parent) return res.status(403).json({ error: 'You do not have access to this conversation.' });
    const Model = room ? Message : DirectMessage;
    const filter = { [room ? 'roomId' : 'conversationId']: id };
    const populate = room ? MESSAGE_POPULATION : { path: 'senderId', select: 'username displayName avatarUrl' };
    const serialize = m => room ? serializeMessage(m, parent) : serializeDirectMessage(m);
    const { before, around } = req.query;
    if ((before && !validId(before)) || (around && !validId(around))) return res.status(400).json({ error: 'Invalid message.' });
    let rows;
    let hasNewer = false;
    if (around) {
      const target = await Model.findOne({ ...filter, _id: around }).lean();
      if (!target) return res.status(404).json({ error: 'This message is no longer available.' });
      const [older, newer] = await Promise.all([
        Model.find({ ...filter, _id: { $lte: around } }).sort({ _id: -1 }).limit(26).populate(populate).lean(),
        Model.find({ ...filter, _id: { $gt: around } }).sort({ _id: 1 }).limit(26).populate(populate).lean(),
      ]);
      hasNewer = newer.length === 26;
      rows = [...older.reverse(), ...newer.slice(0, 25)];
    } else {
      rows = await Model.find({ ...filter, ...(before ? { _id: { $lt: before } } : {}) }).sort({ _id: -1 }).limit(51).populate(populate).lean();
      rows.reverse();
    }
    const hasMore = around ? rows.length >= 26 : rows.length > 50;
    if (!around && hasMore) rows.shift();
    res.json({ messages: rows.map(serialize), pageInfo: { hasMore, hasNewer, nextCursor: rows[0] ? String(rows[0]._id) : null } });
  } catch (error) { next(error); }
});

router.get('/room/:id/people', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid group.' });
    const room = await Room.findOne({ _id: req.params.id, isArchived: false, 'members.userId': req.session.userId })
      .select('members').populate('members.userId', 'username displayName avatarUrl').lean();
    if (!room) return res.status(403).json({ error: 'Join this group to see its members.' });
    // A public profile projection, not the administrative member endpoint.
    res.json({ members: room.members.filter(m => m.userId).map(m => ({ id: String(m.userId._id), username: m.userId.username, displayName: m.userId.displayName, avatarUrl: m.userId.avatarUrl, role: m.role })) });
  } catch (error) { next(error); }
});
module.exports = router;
