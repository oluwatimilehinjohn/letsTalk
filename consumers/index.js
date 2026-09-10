const { createHash } = require("node:crypto");
const { validateEvent, InvalidEventError } = require("../events/envelope");
const { topic } = require("../events/kafkaProducer");
const { log, failure } = require("../utils/logger");
function createMessageHandler({ name, handler, producer }) {
  return async ({ topic: sourceTopic, partition, message, heartbeat = async () => {} }) => {
    let event;
    try {
      try { event = JSON.parse(message.value?.toString() || ""); }
      catch { throw new InvalidEventError(); }
      validateEvent(event);
    } catch (error) {
      if (!(error instanceof InvalidEventError)) throw error;
      const location = { consumer: name, topic: sourceTopic, partition, offset: message.offset };
      await producer.deadLetter({ ...location, reason: "invalid-event", sha256: createHash("sha256").update(message.value || "").digest("hex") });
      failure("event.dead_lettered", error, location);
      return;
    }
    try {
      await handler(event);
      await heartbeat();
      log("info", "event.consumed", { consumer: name, eventId: event.eventId, eventType: event.eventType });
    } catch (error) {
      failure("event.consume.failed", error, { consumer: name, eventId: event.eventId });
      // Throwing leaves the offset uncommitted; KafkaJS retries/restarts consumption.
      throw error;
    }
  };
}
async function startConsumers({ kafka, handlers, producer, onCrash }) {
  const consumers = [];
  try {
    for (const [name, handler] of Object.entries(handlers)) {
      const consumer = kafka.consumer({ groupId: `${process.env.KAFKA_GROUP_ID || "lets-talk"}-${name}-v1`,
        allowAutoTopicCreation: false, retry: { retries: 8 } });
      consumers.push(consumer);
      consumer.on(consumer.events.CRASH, event => {
        failure("consumer.crashed", event.payload.error, { consumer: name });
        if (!event.payload.restart) onCrash?.(event.payload.error);
      });
      await consumer.connect();
      await consumer.subscribe({ topic: topic(), fromBeginning: true });
      await consumer.run({ eachMessage: createMessageHandler({ name, handler, producer }) });
    }
  } catch (error) {
    await Promise.allSettled(consumers.map(consumer => consumer.disconnect()));
    throw error;
  }
  return { async close() { await Promise.allSettled(consumers.map(consumer => consumer.disconnect())); } };
}
module.exports = { startConsumers, createMessageHandler };
