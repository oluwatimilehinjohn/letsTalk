const { UnrecoverableError } = require("bullmq");
const { validateEvent } = require("../events/envelope");
function createProcessors({ repository, queues, recipients }) {
  return {
    async notification(job) {
      if (job.name !== "message") throw new UnrecoverableError("Unknown notification job");
      let event;
      try { event = validateEvent(job.data.event); }
      catch { throw new UnrecoverableError("Invalid notification event"); }
      if (!["message.created", "direct_message.created"].includes(event.eventType)) throw new UnrecoverableError("Unsupported notification event");
      const targets = await recipients(event);
      for (const mongoUserId of targets) {
        const preferences = await repository.preferences(mongoUserId);
        const enabled = event.eventType === "direct_message.created" ? preferences.dmNotifications : preferences.roomNotifications;
        if (!enabled) continue;
        await repository.notification({ key: `${event.eventId}-${mongoUserId}`, mongoUserId,
          eventId: event.eventId, kind: event.eventType, entityId: event.data.conversationId || event.data.roomId });
      }
    },
    async email(job) {
      const data = job.data;
      if (!["welcome-email", "unread-message-summary"].includes(job.name) || data?.template !== job.name ||
        typeof data.key !== "string" || !/^[a-f\d]{24}$/i.test(data.mongoUserId)) throw new UnrecoverableError("Invalid email job");
      const preference = await repository.preferences(data.mongoUserId);
      if (!preference.emailNotifications || (job.name === "unread-message-summary" && !preference.dailyDigest)) return;
      // This sink stores template metadata. A future provider belongs behind this boundary.
      await repository.email(data);
    },
    async maintenance(job) {
      if (job.name === "cleanup-notifications") return repository.cleanup();
      if (job.name !== "daily-digest") throw new UnrecoverableError("Unknown maintenance job");
      // Stable window across retries; 24-hour rolling notification summary ending at scheduled time.
      const end = new Date(job.opts?.prevMillis ?? (job.timestamp + (job.opts?.delay || 0)));
      if (!Number.isFinite(end.getTime())) throw new UnrecoverableError("Invalid digest window");
      const start = new Date(end.getTime() - 86400000);
      let cursor;
      do {
        const users = await repository.digestUsers(cursor);
        for (const user of users) {
          const count = await repository.notificationCount(user.id, start, end);
          if (!count) continue;
          const key = `digest-${job.id}-${user.id}`.replace(/:/g, "-");
          await queues.add("email", "unread-message-summary", { key, mongoUserId: user.mongoUserId,
            template: "unread-message-summary", count }, key);
        }
        cursor = users.length === 100 ? users.at(-1).id : undefined;
      } while (cursor);
    },
  };
}
module.exports = { createProcessors };
