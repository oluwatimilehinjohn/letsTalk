const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { once } = require("node:events");
const { setTimeout: delay } = require("node:timers/promises");

// Never read .env credentials: this suite uses isolated names on local Docker services.
const run = `test_${randomUUID().replace(/-/g, "")}`;
Object.assign(process.env, {
  NODE_ENV: "test", PORT: "0", SESSION_SECRET: randomUUID(), CLOUDINARY_URL: "",
  MONGO_URI: `mongodb://127.0.0.1:27017/${run}`,
  DATABASE_URL: `postgresql://letstalk:local-development-only@127.0.0.1:5432/letstalk?schema=${run}`,
  REDIS_URL: "redis://127.0.0.1:6379", BULLMQ_PREFIX: run,
  KAFKA_BROKERS: "127.0.0.1:9092", KAFKA_CLIENT_ID: run, KAFKA_GROUP_ID: run,
  KAFKA_TOPIC: `${run}.domain`, KAFKA_DLQ_TOPIC: `${run}.dlq`, EVENTS_ENABLED: "true",
  SCHEDULE_TIMEZONE: "America/New_York",
});
async function eventually(check, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const result = await check(); if (result) return result; await delay(100); }
  throw new Error("Timed out waiting for infrastructure result");
}
function ack(socket, event, payload) {
  return new Promise((resolve, reject) => socket.timeout(10000).emit(event, payload, (error, value) => error ? reject(error) : resolve(value)));
}

test("live architecture and existing chat contracts", { timeout: 180000 }, async t => {
  const mongoose = require("mongoose");
  const { createKafka, createProducer } = require("../../events/kafkaProducer");
  const { getPostgres, closePostgres } = require("../../config/postgres");
  const { createRepository } = require("../../repositories/postgres/applicationRepository");
  const { createQueues } = require("../../queues");
  const { startWorkers } = require("../../workers");
  const { startConsumers } = require("../../consumers");
  const { createEventHandlers } = require("../../services/eventProcessingService");
  const { createProcessors } = require("../../services/backgroundJobService");
  const { recipients } = require("../../repositories/mongo/notificationRecipients");
  const { createRelay } = require("../../events/outboxRelay");
  const { registerSchedules } = require("../../schedulers");
  const { io: connect } = require("socket.io-client");
  const Outbox = require("../../models/DomainOutbox");
  const kafka = createKafka();
  const admin = kafka.admin();
  const sockets = [];
  let api, queues, workers, consumers, relay, producer, db;
  t.after(async () => {
    sockets.forEach(socket => socket.disconnect());
    if (relay) await relay.close();
    if (consumers) await consumers.close();
    if (workers) await workers.close();
    if (producer) await producer.close();
    if (queues) {
      // Only this run's uniquely prefixed test queues are removed.
      for (const name of ["notification", "email", "maintenance"]) await queues[name].obliterate({ force: true });
      await queues.close();
    }
    try { await admin.deleteTopics({ topics: [process.env.KAFKA_TOPIC, process.env.KAFKA_DLQ_TOPIC] }); } finally { await admin.disconnect(); }
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === run) await mongoose.connection.dropDatabase();
    if (db) await db.$executeRawUnsafe(`DROP SCHEMA "${run}" CASCADE`);
    if (api) await api.close();
    await closePostgres();
    await mongoose.disconnect();
  });

  const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: process.env, encoding: "utf8", timeout: 60000 });
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);
  api = require("../../server");
  await api.startServer();
  db = getPostgres();
  const repository = createRepository(db);
  const base = `http://127.0.0.1:${api.server.address().port}`;
  async function request(path, { method = "GET", body, cookie } = {}) {
    const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, body: response.status === 204 ? null : await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  }
  async function register(username) {
    const result = await request("/api/auth/register", { method: "POST", body: { username, email: `${username}@example.test`, password: "test-password-123" } });
    assert.equal(result.status, 201);
    return { ...result.body.user, cookie: result.cookie };
  }
  const alice = await register("test_alice");
  const bob = await register("test_bob");
  async function socketFor(user) {
    const socket = connect(base, { transports: ["websocket"], extraHeaders: { Cookie: user.cookie }, reconnection: false });
    sockets.push(socket);
    await Promise.race([once(socket, "connect"), once(socket, "connect_error").then(([error]) => { throw error; })]);
    return socket;
  }
  const a = await socketFor(alice);
  const b = await socketFor(bob);

  await t.test("PostgreSQL identity, preference API and relational constraints", async () => {
    const account = await repository.account(alice.id);
    assert.equal((await repository.account(alice.id)).id, account.id);
    const result = await request("/api/notifications/preferences", { method: "PATCH", cookie: bob.cookie, body: { dmNotifications: true, dailyDigest: true, emailNotifications: true } });
    assert.equal(result.status, 200);
    assert.equal(result.body.dailyDigest, true);
    assert.equal((await request("/api/notifications/preferences")).status, 401);
    assert.equal((await request("/api/notifications/preferences", { method: "PATCH", cookie: bob.cookie, body: { dailyDigest: "false" } })).status, 400);
    await assert.rejects(db.notificationPreference.create({ data: { userId: randomUUID() } }), { code: "P2003" });
  });

  await admin.connect();
  await admin.createTopics({ waitForLeaders: true, topics: [process.env.KAFKA_TOPIC, process.env.KAFKA_DLQ_TOPIC].map(topic => ({ topic, numPartitions: 1, replicationFactor: 1 })) });
  producer = createProducer(kafka);
  await producer.connect();
  queues = createQueues();
  await queues.notification.waitUntilReady();
  const processors = createProcessors({ repository, queues, recipients });
  let first = true;
  workers = startWorkers({ ...processors, notification: async job => {
    if (first) { first = false; throw new Error("Injected transient failure"); }
    return processors.notification(job);
  } });
  await workers.ready();
  consumers = await startConsumers({ kafka, producer, handlers: createEventHandlers({ repository, queues }) });
  relay = createRelay({ outbox: Outbox, producer, interval: 100 });
  let dmEvent;

  await t.test("DM socket -> MongoDB -> Kafka -> consumer -> retrying BullMQ worker -> PostgreSQL", async () => {
    const conversation = await request(`/api/direct-messages/conversations/${bob.id}`, { method: "POST", cookie: alice.cookie });
    assert.equal(conversation.status, 201, JSON.stringify(conversation.body));
    const conversationId = conversation.body.conversation.id;
    assert.equal((await ack(b, "joinDirectConversation", { conversationId })).ok, true);
    const received = once(b, "directMessage");
    const result = await ack(a, "sendDirectMessage", { conversationId, text: "integration DM" });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal((await received)[0].text, "integration DM");
    const stored = await require("../../models/DirectMessage").findById(result.message.id);
    assert.equal(stored.text, "integration DM");
    const row = await Outbox.findOne({ "envelope.data.messageId": String(stored._id) }).lean();
    dmEvent = row.envelope;
    // Real-time delivery already completed while the Kafka relay was stopped.
    assert.equal(row.publishedAt, null);
    relay.start();
    await eventually(() => db.notification.findUnique({ where: { key: `${dmEvent.eventId}-${bob.id}` } }));
    const job = await queues.notification.getJob(dmEvent.eventId);
    await eventually(async () => await job.getState() === "completed");
    assert.equal(job.attemptsMade >= 1, true);
    assert.equal((await Outbox.findById(row._id)).publishedAt instanceof Date, true);
    assert.equal((await ack(b, "markDirectConversationRead", { conversationId })).ok, true);
  });

  await t.test("duplicate delivery produces one notification and one analytics count", async () => {
    await producer.publish(dmEvent);
    const duplicate = await queues.add("notification", "message", { event: dmEvent }, `replay-${dmEvent.eventId}`);
    await eventually(async () => await duplicate.getState() === "completed");
    assert.equal(await db.notification.count({ where: { eventId: dmEvent.eventId } }), 1);
    await eventually(() => db.processedEvent.findUnique({ where: { consumer_eventId: { consumer: "analytics", eventId: dmEvent.eventId } } }));
    const metric = await db.dailyMetric.findFirst({ where: { eventType: "direct_message.created" } });
    assert.equal(metric.count, 1);
  });

  await t.test("room messages, replies, edit, reactions, moderation and audit still work", async () => {
    const room = await request("/api/rooms", { method: "POST", cookie: alice.cookie, body: { name: "Integration room", description: "", visibility: "public" } });
    assert.equal(room.status, 201);
    const roomId = room.body.room.id;
    assert.equal((await ack(a, "joinRoom", { room: roomId })).ok, true);
    assert.equal((await ack(b, "joinRoom", { room: roomId })).ok, true);
    const message = await ack(b, "chatMessage", { text: "room test" });
    assert.equal(message.ok, true);
    const messageId = message.message.id;
    assert.equal((await ack(a, "chatMessage", { text: "reply", replyToId: messageId })).ok, true);
    assert.equal((await ack(b, "editMessage", { messageId, text: "edited" })).ok, true);
    assert.equal((await ack(a, "reactToMessage", { messageId, emoji: "👍" })).ok, true);
    assert.equal((await ack(a, "deleteMessage", { messageId })).ok, true);
    const audit = await eventually(() => db.auditLog.findFirst({ where: { action: "message.moderator_deleted", entityId: messageId } }));
    assert.equal(audit.entityType, "message");
    assert.equal((await require("../../models/Message").findById(messageId)).deletionType, "moderator");
    await eventually(() => db.auditLog.findFirst({ where: { action: "room.created", entityId: roomId } }));
  });

  await t.test("schedules create delayed jobs; digest stores email and cleanup preserves chat", async () => {
    await registerSchedules(queues);
    assert.equal((await queues.maintenance.getJobSchedulers()).length, 2);
    const digest = await queues.add("maintenance", "daily-digest", {}, `digest-${run}`);
    await eventually(async () => await digest.getState() === "completed");
    await eventually(() => db.emailDelivery.findFirst({ where: { template: "unread-message-summary" } }));
    await db.notification.updateMany({ data: { expiresAt: new Date(0) } });
    const count = await require("../../models/DirectMessage").countDocuments();
    const cleanup = await queues.add("maintenance", "cleanup-notifications", {}, `cleanup-${run}`);
    await eventually(async () => await cleanup.getState() === "completed");
    assert.equal(await db.notification.count(), 0);
    assert.equal(await require("../../models/DirectMessage").countDocuments(), count);
    // Tombstones outlive cleanup, so replay cannot resurrect expired notifications.
    await repository.notification({ key: `${dmEvent.eventId}-${bob.id}`, mongoUserId: bob.id, eventId: dmEvent.eventId, kind: dmEvent.eventType, entityId: dmEvent.data.conversationId });
    assert.equal(await db.notification.count(), 0);
  });
});
