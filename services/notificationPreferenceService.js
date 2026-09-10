const { getPostgres } = require("../config/postgres");
const { createRepository } = require("../repositories/postgres/applicationRepository");
const fields = ["dmNotifications", "roomNotifications", "emailNotifications", "dailyDigest"];
function validatePreferences(body) {
  if (!body || Array.isArray(body) || typeof body !== "object" ||
      Object.entries(body).some(([key, value]) => !fields.includes(key) || typeof value !== "boolean")) {
    throw Object.assign(new Error("Use only boolean notification preference fields."), { status: 400 });
  }
  return Object.fromEntries(Object.entries(body));
}
async function preferences(userId, changes) {
  const User = require("../models/User");
  if (!await User.exists({ _id: userId })) throw Object.assign(new Error("Account not found."), { status: 404 });
  return createRepository(getPostgres()).preferences(userId, changes === undefined ? {} : validatePreferences(changes));
}
const listNotifications = userId => createRepository(getPostgres()).listNotifications(userId);
module.exports = { preferences, validatePreferences, listNotifications };
