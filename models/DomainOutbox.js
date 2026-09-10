const mongoose = require("mongoose");
// Infrastructure collection; existing chat schemas are unchanged.
const schema = new mongoose.Schema({
  eventId: { type: String, unique: true, required: true },
  envelope: { type: mongoose.Schema.Types.Mixed, required: true },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  publishedAt: { type: Date, default: null },
  lastError: String,
}, { timestamps: true });
schema.index({ publishedAt: 1, nextAttemptAt: 1 });
// Only delivered events expire. Failed/pending records are retained for repair.
schema.index({ publishedAt: 1 }, { expireAfterSeconds: 7 * 86400 });
module.exports = mongoose.model("DomainOutbox", schema);
