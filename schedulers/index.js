const { jobOptions } = require("../queues");
async function registerSchedules(queues) {
  const tz = process.env.SCHEDULE_TIMEZONE || "UTC";
  new Intl.DateTimeFormat("en", { timeZone: tz }).format();
  await queues.maintenance.upsertJobScheduler("daily-digest-v1", {
    pattern: process.env.NOTIFICATION_DIGEST_CRON || "0 7 * * *", tz,
  }, { name: "daily-digest", data: {}, opts: jobOptions });
  await queues.maintenance.upsertJobScheduler("notification-cleanup-v1", {
    pattern: process.env.MAINTENANCE_CRON || "0 3 * * *", tz,
  }, { name: "cleanup-notifications", data: {}, opts: jobOptions });
}
module.exports = { registerSchedules };
