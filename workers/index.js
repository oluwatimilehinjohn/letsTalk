const { Worker } = require("bullmq");
const { createRedis } = require("../config/redis");
const { log, failure } = require("../utils/logger");
function startWorkers(processors) {
  const connection = createRedis({ worker: true });
  const workers = Object.entries(processors).map(([queue, processor]) => {
    const worker = new Worker(queue, async job => {
      const context = { queue, jobId: job.id, eventId: job.data.event?.eventId || job.data.eventId, attempt: job.attemptsMade + 1 };
      log("info", "job.started", context);
      const result = await processor(job);
      log("info", "job.succeeded", context);
      return result;
    }, { connection, prefix: process.env.BULLMQ_PREFIX || "lets-talk", concurrency: queue === "maintenance" ? 1 : 5,
      ...(queue === "email" ? { limiter: { max: 1, duration: 1000 } } : {}) });
    worker.on("failed", (job, error) => failure("job.failed", error, { queue, jobId: job?.id, attempt: job?.attemptsMade }));
    worker.on("error", error => failure("worker.error", error, { queue }));
    return worker;
  });
  return { async ready() { await Promise.all(workers.map(worker => worker.waitUntilReady())); },
    async close() { await Promise.allSettled(workers.map(worker => worker.close())); connection.disconnect(); } };
}
module.exports = { startWorkers };
