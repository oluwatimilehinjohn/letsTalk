function getUserChannel(userId) {
  const normalizedUserId =
    String(userId || "").trim();

  if (!normalizedUserId) {
    throw new Error(
      "A user ID is required."
    );
  }

  return `user:${normalizedUserId}`;
}

module.exports = {
  getUserChannel,
};