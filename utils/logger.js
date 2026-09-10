// Allowlisted context prevents payloads, credentials and session IDs entering logs.
const allowed = new Set(["requestId", "socketEvent", "eventId", "eventType", "jobId", "queue", "consumer", "status", "durationMs", "attempt", "errorName", "errorCode", "topic", "partition", "offset", "count"]);
function log(level, message, context = {}) {
  const fields = Object.fromEntries(Object.entries(context).filter(([key]) => allowed.has(key)));
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }));
}
const failure = (message, error, context = {}) => log("error", message, { ...context, errorName: error?.name, errorCode: error?.code });
module.exports = { log, failure };
