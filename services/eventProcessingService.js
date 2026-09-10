const { auditTypes } = require("../events/eventTypes");
const { validateEvent } = require("../events/envelope");
function createEventHandlers({ repository, queues }) {
  return {
    async notification(event) {
      validateEvent(event);
      if (["message.created", "direct_message.created"].includes(event.eventType)) {
        await queues.add("notification", "message", { event }, event.eventId);
      } else if (event.eventType === "user.created") {
        const key = `welcome-${event.data.actorUserId}`;
        await queues.add("email", "welcome-email", { key,
          mongoUserId: event.data.actorUserId, eventId: event.eventId, template: "welcome-email" }, key);
      }
    },
    async analytics(event) {
      validateEvent(event);
      if (["message.created", "direct_message.created", "room.created", "user.created"].includes(event.eventType)) await repository.analytics(event);
    },
    async audit(event) {
      validateEvent(event);
      if (auditTypes.has(event.eventType)) await repository.audit(event);
    },
  };
}
module.exports = { createEventHandlers };
