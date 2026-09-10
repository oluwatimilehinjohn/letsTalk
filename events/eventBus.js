const { createEvent } = require("./envelope");
const { log, failure } = require("../utils/logger");
const { context } = require("../utils/requestContext");
async function publish(eventType, data) {
  if (process.env.EVENTS_ENABLED !== "true") return null;
  const event = createEvent(eventType, data, context.getStore()?.requestId);
  try {
    await require("../models/DomainOutbox").create({ eventId: event.eventId, envelope: event });
    log("info", "event.outbox.saved", event);
  } catch (error) {
    // The chat write already succeeded. Do not invite a duplicate message retry.
    failure("event.outbox.write_failed", error, event);
  }
  return event;
}
module.exports = { publish };
