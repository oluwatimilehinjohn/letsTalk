function getSocketUserId(socket) {
  const authenticatedUser =
    socket.data
      ?.authenticatedUser;

  const userId =
    authenticatedUser?.id ||
    authenticatedUser?._id ||
    socket.request
      ?.session
      ?.userId ||
    null;

  if (!userId) {
    return null;
  }

  return String(userId);
}

module.exports = {
  getSocketUserId,
};