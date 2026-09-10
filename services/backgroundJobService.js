const { UnrecoverableError } = require("bullmq");
const { validateEvent } = require("../events/envelope");
const { previousNigeriaDay, defaultSummarySource } = require("./dailySummaryService");
const { renderEmail, createEmailSender } = require("./emailService");
function createProcessors({ repository, queues, recipients, summarySource = defaultSummarySource(), emailSender = createEmailSender() }) {
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
      const welcome = job.name === "welcome-email";
      if (!welcome && (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
        !Number.isFinite(new Date(data.start).getTime()) || !Number.isFinite(new Date(data.end).getTime()))) {
        throw new UnrecoverableError("Invalid summary window; enqueue a new daily digest");
      }
      if (!welcome) {
        const expected = previousNigeriaDay(data.end);
        if (expected.date !== data.date || expected.start.getTime() !== new Date(data.start).getTime() ||
          expected.end.getTime() !== new Date(data.end).getTime()) throw new UnrecoverableError("Invalid Nigeria calendar-day window");
      }
      const key = welcome ? `welcome-${data.mongoUserId}` : `digest-${data.date}-${data.mongoUserId}`;
      const existing = await repository.emailDelivery(key);
      if (existing?.status === "sent") return;
      const user = await summarySource.user(data.mongoUserId);
      if (!user) return;
      const config = emailSender.config();
      const summary = welcome ? null : await summarySource.summary(data.mongoUserId, new Date(data.start), new Date(data.end));
      const payload = { from: config.from, to: [user.email],
        ...renderEmail(user, data.template, summary, data.date, config.appUrl) };
      const delivery = await repository.prepareEmail({ ...data, key, payload });
      if (delivery.status === "sent") return;
      // Resend retains idempotency keys for 24h. Do not blindly replay ambiguous older attempts.
      if (Date.now() - new Date(delivery.createdAt).getTime() > 23 * 3600000) {
        throw new UnrecoverableError("Email retry window expired; check provider delivery before retrying");
      }
      const providerId = await emailSender.send(delivery.payload, key);
      await repository.markEmailSent(key, providerId);
    },
    async maintenance(job) {
      if (job.name === "cleanup-notifications") return repository.cleanup();
      if (job.name !== "daily-digest") throw new UnrecoverableError("Unknown maintenance job");
      const scheduledAt = new Date(job.opts?.prevMillis ?? (job.timestamp + (job.opts?.delay || 0)));
      if (!Number.isFinite(scheduledAt.getTime())) throw new UnrecoverableError("Invalid digest window");
      const { start, end, date } = previousNigeriaDay(scheduledAt);
      let cursor;
      do {
        const users = await summarySource.users(cursor, scheduledAt);
        for (const user of users) {
          const mongoUserId = String(user._id);
          const key = `digest-${date}-${mongoUserId}`;
          await queues.add("email", "unread-message-summary", { key, mongoUserId,
            template: "unread-message-summary", date, start: start.toISOString(), end: end.toISOString() }, key);
        }
        cursor = users.length === 100 ? users.at(-1)._id : undefined;
      } while (cursor);
    },
  };
}
module.exports = { createProcessors };
