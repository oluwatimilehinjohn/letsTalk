let client;
function getPostgres() {
  if (!process.env.DATABASE_URL) throw Object.assign(new Error("Relational services are disabled."), { status: 503 });
  if (!client) {
    const { PrismaClient } = require("@prisma/client");
    client = new PrismaClient();
  }
  return client;
}
async function connectPostgres() {
  if (process.env.DATABASE_URL) await getPostgres().$connect();
}
async function closePostgres() {
  if (client) await client.$disconnect();
}
module.exports = { getPostgres, connectPostgres, closePostgres };
