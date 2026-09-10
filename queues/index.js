const { Queue } = require("bullmq");
const { createRedis } = require("../config/redis");
const { log, failure } = require("../utils/logger");
const jobOptions = Object.freeze({ attempts: 5, backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { age: 7 * 86400, count: 10000 }, removeOnFail: false });
function createQueues(connection = createRedis()) {
  const queues = Object.fromEntries(["notification", "email", "maintenance"].map(name => {
    const queue = new Queue(name, { connection, prefix: process.env.BULLMQ_PREFIX || "lets-talk", defaultJobOptions: jobOptions });
    queue.on("error", error => failure("queue.connection.failed", error, { queue: name }));
    return [name, queue];
  }));
  return { ...queues,
    async add(queue, name, data, jobId) {
      const job = await queues[queue].add(name, data, { jobId });
      log("info", "job.enqueued", { queue, jobId: job.id, eventId: data.eventId || data.event?.eventId });
      return job;
    },
    async close() {
      await Promise.allSettled(Object.values(queues).map(queue => queue.close()));
      connection.disconnect();
    },
  };
}
module.exports = { createQueues, jobOptions };
