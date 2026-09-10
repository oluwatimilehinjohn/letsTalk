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
test("digest uses stable window and job IDs on retry; email remains opt-in", async () => {
  const jobs = [];
  const windows = [];
  let emails = 0;
  const repository = { digestUsers: async () => [{ id: "account", mongoUserId: id }],
    notificationCount: async (_, start, end) => { windows.push([start, end]); return 2; },
    preferences: async () => ({ emailNotifications: false }), email: async () => emails++ };
  const processors = createProcessors({ repository, queues: { add: async (...args) => jobs.push(args) } });
  const job = { name: "daily-digest", id: "repeat:123", timestamp: Date.now(), opts: { delay: 60000 } };
  await processors.maintenance(job);
  await processors.maintenance(job);
  assert.equal(jobs[0][3], jobs[1][3]);
  assert.deepEqual(windows[0], windows[1]);
  await processors.email({ name: jobs[0][1], data: jobs[0][2] });
  assert.equal(emails, 0);
});
test("scheduler supplies explicit timezone and stable scheduler identities", async () => {
  const schedules = [];
  await registerSchedules({ maintenance: { upsertJobScheduler: async (...args) => schedules.push(args) } });
  assert.equal(schedules.length, 2);
  assert.ok(schedules.every(([, options]) => options.tz && options.pattern));
});
test("shutdown closes resources in reverse order once despite individual failure", async () => {
  const order = [];
  const lifecycle = createLifecycle();
  lifecycle.add(async () => order.push("database"));
  lifecycle.add(async () => { order.push("worker"); throw new Error("close failed"); });
  await Promise.all([lifecycle.close(), lifecycle.close()]);
  assert.deepEqual(order, ["worker", "database"]);
});
