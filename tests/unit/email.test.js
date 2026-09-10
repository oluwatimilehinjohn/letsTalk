const test = require("node:test");
const assert = require("node:assert/strict");
const { previousNigeriaDay, membershipWindow, createSummarySource } = require("../../services/dailySummaryService");
const { renderEmail, createEmailSender } = require("../../services/emailService");
const { createProcessors } = require("../../services/backgroundJobService");
const { createEventHandlers } = require("../../services/eventProcessingService");
const { createEvent } = require("../../events/envelope");
const id = "0123456789abcdef01234567";
const user = { email: "recipient@example.test", displayName: "<img src=x>" };
test("previous day uses Nigeria midnight across year and leap-day boundaries", () => {
  for (const [scheduled, date, start, end] of [
    ["2026-01-01T06:00:00Z", "2025-12-31", "2025-12-30T23:00:00.000Z", "2025-12-31T23:00:00.000Z"],
    ["2024-03-01T06:00:00Z", "2024-02-29", "2024-02-28T23:00:00.000Z", "2024-02-29T23:00:00.000Z"],
  ]) {
    const window = previousNigeriaDay(scheduled);
    assert.equal(window.date, date); assert.equal(window.start.toISOString(), start); assert.equal(window.end.toISOString(), end);
  }
  assert.throws(() => previousNigeriaDay("invalid"));
});
test("membership clips history at join time and excludes nonmembers and later joins", () => {
  const start = new Date("2026-09-08T23:00:00Z"), end = new Date("2026-09-09T23:00:00Z");
  assert.equal(membershipWindow([], id, start, end), null);
  assert.equal(membershipWindow([{ userId: id, joinedAt: end }], id, start, end), null);
  const joinedAt = new Date("2026-09-09T12:00:00Z");
  assert.deepEqual(membershipWindow([{ userId: { _id: id }, joinedAt }], id, start, end), { $gte: joinedAt, $lt: end });
});
test("summary queries only current memberships, nondeleted messages, and the requested day", async () => {
  const queries = [];
  const chain = result => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => result });
  const messageModel = { countDocuments: async filter => { queries.push(filter); return 2; }, find: () => chain([{ text: "Hello" }]) };
  const source = createSummarySource({
    Room: { find: filter => { assert.deepEqual(filter, { isArchived: false, "members.userId": id });
      return chain([{ _id: "room", name: "Friends", members: [{ userId: id, joinedAt: new Date(0) }] }]); } },
    DirectConversation: { find: filter => { assert.deepEqual(filter, { isArchived: false, "participants.userId": id }); return chain([]); } },
    Message: messageModel,
  });
  const { start, end } = previousNigeriaDay("2026-09-10T06:00:00Z");
  const summary = await source.summary(id, start, end);
  assert.deepEqual(queries, [{ roomId: "room", isDeleted: false, createdAt: { $gte: start, $lt: end } }]);
  assert.equal(summary.count, 2); assert.deepEqual(summary.sections[0].previews, ["Hello"]);
});
test("templates escape user/message HTML and provide quiet-day text", () => {
  const quiet = renderEmail(user, "unread-message-summary", { count: 0, conversationCount: 0, sections: [] }, "2026-09-09", "https://example.test");
  assert.match(quiet.text, /No messages/); assert.ok(!quiet.html.includes("<img"));
  const active = renderEmail(user, "unread-message-summary", { count: 1, conversationCount: 1,
    sections: [{ title: "<script>", count: 1, previews: ["<img src=x>"] }] }, "2026-09-09", "https://example.test");
  assert.ok(!active.html.includes("<script>")); assert.ok(!active.html.includes("<img"));
  assert.throws(() => renderEmail(user, "welcome-email", null, null, "javascript:alert(1)"));
});
function fixture() {
  const records = new Map(), sends = [];
  const repository = {
    emailDelivery: async key => records.get(key),
    prepareEmail: async data => {
      if (!records.has(data.key)) records.set(data.key, { ...data, status: "pending", createdAt: new Date() });
      return records.get(data.key);
    },
    markEmailSent: async key => { records.get(key).status = "sent"; },
  };
  const emailSender = { config: () => ({ from: "sender@example.test", appUrl: "https://example.test" }),
    send: async (payload, key) => { sends.push({ payload, key }); return "provider-id"; } };
  const processors = createProcessors({ repository, emailSender, summarySource: {
    user: async () => user, summary: async () => ({ count: 0, conversationCount: 0, sections: [] }),
  } });
  return { records, sends, processors, repository, emailSender };
}
test("registration queues one welcome per user and delivery ignores old opt-in defaults", async () => {
  const jobs = [];
  const handler = createEventHandlers({ queues: { add: async (...args) => jobs.push(args) } });
  await handler.notification(createEvent("user.created", { actorUserId: id }));
  await handler.notification(createEvent("user.created", { actorUserId: id }));
  assert.equal(jobs[0][3], jobs[1][3]);
  const { processors, sends } = fixture();
  const job = { name: jobs[0][1], data: jobs[0][2] };
  await processors.email(job); await processors.email(job);
  assert.equal(sends.length, 1); assert.deepEqual(sends[0].payload.to, [user.email]);
  assert.match(sends[0].payload.subject, /Welcome/);
});
test("daily emails send even when there are zero messages", async () => {
  const { processors, sends } = fixture();
  await processors.email({ name: "unread-message-summary", data: { key: "daily", template: "unread-message-summary", mongoUserId: id,
    date: "2026-09-09", start: "2026-09-08T23:00:00Z", end: "2026-09-09T23:00:00Z" } });
  assert.equal(sends.length, 1); assert.match(sends[0].payload.text, /No messages/);
});
test("digest pages beyond 100 users without relying on notification preferences", async () => {
  const users = Array.from({ length: 101 }, (_, index) => ({ _id: index.toString(16).padStart(24, "0") }));
  const cursors = [], jobs = [];
  const processors = createProcessors({ repository: {}, summarySource: { users: async cursor => {
    cursors.push(cursor); return cursor ? users.slice(100) : users.slice(0, 100);
  } }, queues: { add: async (...args) => jobs.push(args) } });
  await processors.maintenance({ name: "daily-digest", timestamp: Date.parse("2026-09-10T06:00:00Z") });
  assert.equal(jobs.length, 101); assert.deepEqual(cursors, [undefined, users[99]._id]);
  assert.equal(new Set(jobs.map(job => job[3])).size, 101);
});
test("malformed or non-calendar digest windows never reach delivery", async () => {
  const { processors, sends } = fixture();
  await assert.rejects(processors.email({ name: "unread-message-summary", data: { key: "daily", template: "unread-message-summary", mongoUserId: id,
    date: "2026-09-09", start: "2026-09-09T06:00:00Z", end: "2026-09-10T06:00:00Z" } }), /calendar-day/);
  assert.equal(sends.length, 0);
});
test("provider failures remain pending and retries reuse exactly the stored request", async () => {
  const { processors, records, emailSender } = fixture();
  const payloads = [];
  emailSender.send = async payload => { payloads.push(payload); throw new Error("offline"); };
  const job = { name: "welcome-email", data: { key: "welcome", template: "welcome-email", mongoUserId: id } };
  await assert.rejects(processors.email(job), /offline/);
  await assert.rejects(processors.email(job), /offline/);
  assert.equal(records.get(`welcome-${id}`).status, "pending");
  assert.deepEqual(payloads[0], payloads[1]);
  records.get(`welcome-${id}`).createdAt = new Date(Date.now() - 24 * 3600000);
  await assert.rejects(processors.email(job), /retry window expired/);
  assert.equal(payloads.length, 2);
});
test("Resend adapter authenticates, supplies idempotency, and reports safe failures", async () => {
  const env = { RESEND_API_KEY: "test-key", EMAIL_FROM: "test@example.test", APP_URL: "https://example.test" };
  const sender = createEmailSender({ env, fetchImpl: async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails"); assert.equal(options.headers["Idempotency-Key"], "stable-key");
    assert.equal(options.headers.Authorization, "Bearer test-key"); return { ok: true, json: async () => ({ id: "accepted" }) };
  } });
  assert.equal(await sender.send({ to: [user.email] }, "stable-key"), "accepted");
  for (const status of [429, 500, 422]) {
    const failed = createEmailSender({ env, fetchImpl: async () => ({ ok: false, status }) });
    await assert.rejects(failed.send({}, "key"), { name: status === 422 ? "UnrecoverableError" : "Error", message: `Email provider returned HTTP ${status}` });
  }
  assert.throws(() => createEmailSender({ env: {} }).config(), /Configure/);
});
