require("dotenv").config();
const { createKafka, topic, dlqTopic } = require("../events/kafkaProducer");
async function main() {
  const admin = createKafka().admin();
  try {
    await admin.connect();
    await admin.createTopics({ waitForLeaders: true, topics: [topic(), dlqTopic()].map(name => ({
      topic: name, numPartitions: 3, replicationFactor: 1,
      configEntries: [{ name: "retention.ms", value: String(7 * 86400000) }] })) });
  } finally { await admin.disconnect(); }
}
main().catch(error => { require("../utils/logger").failure("kafka.setup.failed", error); process.exitCode = 1; });
