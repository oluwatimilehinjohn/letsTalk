const { failure } = require("../utils/logger");
function createRelay({ outbox, producer, interval = 1000 }) {
  let timer;
  let running;
  let stopped = true;
  async function tick() {
    const rows = await outbox.find({ publishedAt: null, nextAttemptAt: { $lte: new Date() } }).sort({ _id: 1 }).limit(100).lean();
    for (const row of rows) {
      try {
        await producer.publish(row.envelope);
        await outbox.updateOne({ _id: row._id }, { $set: { publishedAt: new Date(), lastError: null } });
      } catch (error) {
        failure("event.publish.failed", error, { eventId: row.eventId, attempt: row.attempts + 1 });
        await outbox.updateOne({ _id: row._id }, { $inc: { attempts: 1 }, $set: {
          lastError: error.name, nextAttemptAt: new Date(Date.now() + Math.min(60000, 1000 * 2 ** Math.min(row.attempts, 6))) } });
      }
    }
  }
  function loop() {
    running = tick().catch(error => failure("outbox.relay.failed", error)).finally(() => {
      if (!stopped) timer = setTimeout(loop, interval);
    });
  }
  return { tick, start() { stopped = false; loop(); }, async close() { stopped = true; clearTimeout(timer); await running; } };
}
module.exports = { createRelay };
