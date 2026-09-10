require("dotenv").config();
const { createQueues } = require("../queues");
async function main() {
  const queues = createQueues();
  try {
    for (const name of ["notification", "email", "maintenance"]) {
      const queue = queues[name];
      console.log(name, await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed"));
      const failed = await queue.getFailed(0, 49);
      console.log(failed.map(job => ({ jobId: job.id, name: job.name, attempts: job.attemptsMade })));
    }
  } finally { await queues.close(); }
}
main().catch(error => { require("../utils/logger").failure("jobs.inspect.failed", error); process.exitCode = 1; });
