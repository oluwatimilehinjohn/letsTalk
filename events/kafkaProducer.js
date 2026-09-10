const { Kafka, logLevel } = require("kafkajs");
const { validateEvent } = require("./envelope");
const { log } = require("../utils/logger");
function createKafka() {
  if (!process.env.KAFKA_BROKERS) throw new Error("KAFKA_BROKERS is required");
  return new Kafka({ clientId: process.env.KAFKA_CLIENT_ID || "lets-talk",
    brokers: process.env.KAFKA_BROKERS.split(",").map(value => value.trim()),
    logLevel: logLevel.NOTHING, connectionTimeout: 5000, requestTimeout: 10000,
    retry: { retries: 5, initialRetryTime: 300 } });
}
const topic = () => process.env.KAFKA_TOPIC || "lets-talk.domain.v1";
const dlqTopic = () => process.env.KAFKA_DLQ_TOPIC || "lets-talk.dead-letter.v1";
function createProducer(kafka = createKafka()) {
  const producer = kafka.producer({ allowAutoTopicCreation: false, idempotent: true, maxInFlightRequests: 1 });
  return {
    connect: () => producer.connect(), close: () => producer.disconnect(),
    async publish(event) {
      validateEvent(event);
      await producer.send({ topic: topic(), acks: -1, messages: [{
        key: event.data.conversationId || event.data.roomId || event.data.actorUserId,
        value: JSON.stringify(event), headers: { eventId: event.eventId } }] });
      log("info", "event.kafka.acknowledged", event);
    },
    async deadLetter(details) {
      // Preserve broker coordinates and hash, not an untrusted raw payload.
      await producer.send({ topic: dlqTopic(), acks: -1, messages: [{ value: JSON.stringify(details) }] });
    },
  };
}
module.exports = { createKafka, createProducer, topic, dlqTopic };
