const test = require("node:test");
const assert = require("node:assert/strict");
const { createEvent, validateEvent } = require("../../events/envelope");
const { createProducer } = require("../../events/kafkaProducer");
const { createMessageHandler } = require("../../consumers");
const { createRelay } = require("../../events/outboxRelay");
const id = "0123456789abcdef01234567";
test("envelope is versioned and excludes credentials and message contents", () => {
  const event = createEvent("message.created", { actorUserId: id, roomId: id, messageId: id, text: "private", passwordHash: "secret" });
  assert.deepEqual(Object.keys(event.data).sort(), ["actorUserId", "messageId", "roomId"]);
  assert.notEqual(event.eventId, createEvent("user.created", { actorUserId: id }).eventId);
  assert.throws(() => validateEvent({ ...event, version: 2 }));
  assert.throws(() => validateEvent({ ...event, data: { ...event.data, token: "secret" } }));
});
test("producer requires broker acknowledgment and uses conversation ordering key", async () => {
  let sent;
  const producer = createProducer({ producer: () => ({ send: async input => { sent = input; } }) });
  const event = createEvent("direct_message.created", { actorUserId: id, messageId: id, conversationId: id, recipientUserId: id });
  await producer.publish(event);
  assert.equal(sent.acks, -1);
  assert.equal(sent.messages[0].key, id);
  assert.deepEqual(JSON.parse(sent.messages[0].value), event);
});
test("invalid Kafka message is quarantined without leaking raw contents", async () => {
  let quarantined;
  const handler = createMessageHandler({ name: "notification", handler: () => assert.fail(), producer: { deadLetter: async value => { quarantined = value; } } });
  await handler({ topic: "domain", partition: 1, message: { offset: "4", value: Buffer.from('{"password":"secret"}') } });
  assert.equal(quarantined.offset, "4");
  assert.equal(quarantined.sha256.length, 64);
  assert.ok(!JSON.stringify(quarantined).includes("secret"));
});
test("transient consumer failure propagates so its offset is not acknowledged", async () => {
  const event = createEvent("user.created", { actorUserId: id });
  const handler = createMessageHandler({ name: "analytics", handler: async () => { throw new Error("database offline"); }, producer: {} });
  await assert.rejects(handler({ message: { value: Buffer.from(JSON.stringify(event)) } }), /database offline/);
});
test("outbox retains failed events with backoff and marks only acknowledged events delivered", async () => {
  const updates = [];
  const row = { _id: id, eventId: "event", attempts: 2, envelope: {} };
  const outbox = { find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [row] }) }) }), updateOne: async (_, update) => updates.push(update) };
  await createRelay({ outbox, producer: { publish: async () => { throw new Error("offline"); } } }).tick();
  assert.equal(updates[0].$inc.attempts, 1);
  assert.ok(updates[0].$set.nextAttemptAt > new Date());
  assert.equal(updates[0].$set.publishedAt, undefined);
  await createRelay({ outbox, producer: { publish: async () => {} } }).tick();
  assert.ok(updates[1].$set.publishedAt instanceof Date);
});
