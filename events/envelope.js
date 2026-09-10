const { randomUUID } = require("node:crypto");
const { schemas } = require("./eventTypes");
class InvalidEventError extends Error { constructor() { super("Invalid domain event"); this.name = "InvalidEventError"; } }
function validateEvent(event) {
  const fields = schemas[event?.eventType];
  if (!fields || event.version !== 1 || event.source !== "lets-talk-api" ||
      !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(event.eventId) ||
      typeof event.occurredAt !== "string" || !Number.isFinite(Date.parse(event.occurredAt)) ||
      !event.data || Object.keys(event.data).length !== fields.length ||
      fields.some(key => typeof event.data[key] !== "string" || (key === "role"
        ? !["admin", "member"].includes(event.data[key]) : !/^[a-f\d]{24}$/i.test(event.data[key]))) ||
      Object.keys(event).some(key => !["eventId", "eventType", "occurredAt", "version", "source", "data", "requestId"].includes(key)) ||
      (event.requestId !== undefined && !/^[a-f\d-]{36}$/i.test(event.requestId))) throw new InvalidEventError();
  return event;
}
function createEvent(eventType, payload, requestId) {
  const fields = schemas[eventType];
  if (!fields) throw new InvalidEventError();
  return validateEvent({ eventId: randomUUID(), eventType, occurredAt: new Date().toISOString(),
    version: 1, source: "lets-talk-api", data: Object.fromEntries(fields.map(key => [key, String(payload[key] ?? "")])),
    ...(requestId ? { requestId } : {}) });
}
module.exports = { createEvent, validateEvent, InvalidEventError };
