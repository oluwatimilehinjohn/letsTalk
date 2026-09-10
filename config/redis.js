const Redis = require("ioredis");
const { failure } = require("../utils/logger");
function createRedis({ worker = false } = {}) {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required");
  const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: worker ? null : 1,
    enableOfflineQueue: worker,
    connectTimeout: 5000,
  });
  connection.on("error", error => failure("redis.connection.failed", error));
  return connection;
}
module.exports = { createRedis };
