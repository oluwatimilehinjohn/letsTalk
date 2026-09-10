require("dotenv").config();
const mongoose = require("mongoose");
const { createLifecycle } = require("../utils/lifecycle");
const { getPostgres, connectPostgres, closePostgres } = require("../config/postgres");
const { createRepository } = require("../repositories/postgres/applicationRepository");
const { createKafka, createProducer } = require("../events/kafkaProducer");
const { createRelay } = require("../events/outboxRelay");
const { createQueues } = require("../queues");
const { startConsumers } = require("../consumers");
const { startWorkers } = require("../workers");
const { createEventHandlers } = require("../services/eventProcessingService");
const { createProcessors } = require("../services/backgroundJobService");
const { recipients } = require("../repositories/mongo/notificationRecipients");
const { registerSchedules } = require("../schedulers");
const { failure, log } = require("../utils/logger");
const lifecycle = createLifecycle();
async function main() {
  const mode = process.argv[2] || "all";
  if (!["all", "consumers", "workers", "scheduler", "relay"].includes(mode)) throw new Error("Invalid background mode");
  lifecycle.signals();
  lifecycle.add(() => mongoose.disconnect());
  await require("../config/db")();
  lifecycle.add(closePostgres);
  await connectPostgres();
  const repository = createRepository(getPostgres());
  const queues = createQueues();
  lifecycle.add(() => queues.close());
  await queues.notification.waitUntilReady();
  if (["all", "workers"].includes(mode)) {
    const workers = startWorkers(createProcessors({ repository, queues, recipients }));
    lifecycle.add(() => workers.close());
    await workers.ready();
  }
  if (["all", "scheduler"].includes(mode)) await registerSchedules(queues);
  if (["all", "consumers", "relay"].includes(mode)) {
    const kafka = createKafka();
    const producer = createProducer(kafka);
    lifecycle.add(() => producer.close());
    await producer.connect();
    if (["all", "consumers"].includes(mode)) {
      const consumers = await startConsumers({ kafka, producer, handlers: createEventHandlers({ repository, queues }),
        onCrash: () => { void lifecycle.stop(1); } });
      lifecycle.add(() => consumers.close());
    }
    if (["all", "relay"].includes(mode)) {
      const outbox = require("../models/DomainOutbox");
      await outbox.init();
      const relay = createRelay({ outbox, producer, interval: Math.max(100, Number(process.env.OUTBOX_POLL_MS) || 1000) });
      lifecycle.add(() => relay.close());
      relay.start();
    }
  }
  log("info", "background.ready");
  if (mode === "scheduler") await lifecycle.stop();
}
main().catch(async error => { failure("background.startup.failed", error); await lifecycle.stop(1); });
