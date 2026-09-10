const test = require("node:test");
const assert = require("node:assert/strict");
const { createEvent } = require("../../events/envelope");
const { createEventHandlers } = require("../../services/eventProcessingService");
const { createProcessors } = require("../../services/backgroundJobService");
const { validatePreferences } = require("../../services/notificationPreferenceService");
const { registerSchedules } = require("../../schedulers");
const { createLifecycle } = require("../../utils/lifecycle");
const id = "0123456789abcdef01234567";
test("preferences reject unknown fields and non-boolean values", () => {
  assert.deepEqual(validatePreferences({ dailyDigest: true }), { dailyDigest: true });
  assert.throws(() => validatePreferences({ userId: id }));
  assert.throws(() => validatePreferences({ emailNotifications: "false" }));
});
test("notification consumer queues stable event ID and worker honors preferences", async () => {
  const event = createEvent("direct_message.created", { actorUserId: id, recipientUserId: id, messageId: id, conversationId: id });
  let enqueued;
  let created = 0;
  let enabled = false;
  const queues = { add: async (...args) => { enqueued = args; } };
  await createEventHandlers({ queues }).notification(event);
  assert.equal(enqueued[3], event.eventId);
  const processor = createProcessors({ queues, recipients: async () => [id], repository: {
    preferences: async () => ({ dmNotifications: enabled }), notification: async () => { created++; },
  } });
  await processor.notification({ name: "message", data: enqueued[2] });
  assert.equal(created, 0);
  enabled = true;
  await processor.notification({ name: "message", data: enqueued[2] });
  assert.equal(created, 1);
  await assert.rejects(processor.notification({ name: "invalid" }), { name: "UnrecoverableError" });
});
test("digest includes all Mongo users and keeps Nigeria date and IDs stable on retry", async () => {
  const jobs = [];
  const processors = createProcessors({ repository: {}, summarySource: { users: async () => [{ _id: id }] },
    queues: { add: async (...args) => jobs.push(args) } });
  const job = { name: "daily-digest", id: "repeat:123", timestamp: Date.parse("2026-09-10T06:00:00Z"), opts: {} };
  await processors.maintenance(job);
  await processors.maintenance(job);
  assert.equal(jobs[0][3], jobs[1][3]);
  assert.equal(jobs[0][2].start, "2026-09-08T23:00:00.000Z");
  assert.equal(jobs[0][2].end, "2026-09-09T23:00:00.000Z");
  assert.equal(jobs[0][2].date, "2026-09-09");
  assert.equal(jobs[0][2].mongoUserId, id);
});
test("scheduler supplies explicit timezone and stable scheduler identities", async () => {
  const schedules = [];
  await registerSchedules({ maintenance: { upsertJobScheduler: async (...args) => schedules.push(args) } });
  assert.equal(schedules.length, 2);
  assert.ok(schedules.every(([, options]) => options.tz && options.pattern));
  assert.equal(schedules[0][1].tz, "Africa/Lagos");
  assert.equal(schedules[0][1].pattern, "0 7 * * *");
});
test("shutdown closes resources in reverse order once despite individual failure", async () => {
  const order = [];
  const lifecycle = createLifecycle();
  lifecycle.add(async () => order.push("database"));
  lifecycle.add(async () => { order.push("worker"); throw new Error("close failed"); });
  await Promise.all([lifecycle.close(), lifecycle.close()]);
  assert.deepEqual(order, ["worker", "database"]);
});
