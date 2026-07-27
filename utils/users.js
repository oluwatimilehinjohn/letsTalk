const users = [];

function normalizeValue(value) {
  return String(value || "").trim();
}

function userJoin({
  socketId,
  userId,
  username,
  displayName,
  avatarUrl,
  roomId,
  roomName,
  roomSlug,
  roomChannel,
}) {
  const existingIndex =
    users.findIndex((user) => {
      return user.socketId === socketId;
    });

  if (existingIndex !== -1) {
    users.splice(existingIndex, 1);
  }

  const user = {
    socketId,

    /*
     * Compatibility alias for older
     * frontend and socket code.
     */
    id: socketId,

    userId:
      normalizeValue(userId),

    username:
      normalizeValue(username),

    displayName:
      normalizeValue(displayName) ||
      normalizeValue(username),

    avatarUrl:
      normalizeValue(avatarUrl),

    roomId:
      normalizeValue(roomId),

    roomName:
      normalizeValue(roomName),

    roomSlug:
      normalizeValue(roomSlug),

    roomChannel:
      normalizeValue(roomChannel),

    /*
     * Compatibility alias for older
     * code that reads user.room.
     */
    room:
      normalizeValue(roomName),
  };

  users.push(user);

  return user;
}

function getCurrentUser(socketId) {
  return (
    users.find((user) => {
      return user.socketId === socketId;
    }) || null
  );
}

function userLeave(socketId) {
  const index =
    users.findIndex((user) => {
      return user.socketId === socketId;
    });

  if (index === -1) {
    return null;
  }

  return users.splice(index, 1)[0];
}

function matchesRoom(
  user,
  roomIdentifier
) {
  const identifier =
    normalizeValue(roomIdentifier);

  if (!identifier) {
    return false;
  }

  return [
    user.roomId,
    user.roomName,
    user.roomSlug,
    user.roomChannel,
    user.room,
  ].includes(identifier);
}

function getRoomUsers(roomIdentifier) {
  return users
    .filter((user) => {
      return matchesRoom(
        user,
        roomIdentifier
      );
    })
    .map((user) => {
      return {
        id:
          user.socketId,

        socketId:
          user.socketId,

        userId:
          user.userId,

        username:
          user.username,

        displayName:
          user.displayName,

        avatarUrl:
          user.avatarUrl,

        roomId:
          user.roomId,

        room:
          user.roomName,

        roomName:
          user.roomName,

        roomSlug:
          user.roomSlug,

        roomChannel:
          user.roomChannel,
      };
    });
}

/*
 * Returns true when the user still has
 * at least one active socket connection.
 *
 * The optional excludedSocketId is useful
 * while processing a disconnect event.
 */
function isUserOnline(
  userId,
  excludedSocketId = null
) {
  const normalizedUserId =
    normalizeValue(userId);

  if (!normalizedUserId) {
    return false;
  }

  return users.some((user) => {
    if (
      excludedSocketId &&
      user.socketId ===
        excludedSocketId
    ) {
      return false;
    }

    return (
      user.userId ===
      normalizedUserId
    );
  });
}

function getUserSockets(userId) {
  const normalizedUserId =
    normalizeValue(userId);

  if (!normalizedUserId) {
    return [];
  }

  return users.filter((user) => {
    return (
      user.userId ===
      normalizedUserId
    );
  });
}

module.exports = {
  getCurrentUser,
  getRoomUsers,
  getUserSockets,
  isUserOnline,
  userJoin,
  userLeave,
};