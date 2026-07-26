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
     * Compatibility alias for older code that
     * still reads user.room.
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

  return [
    user.roomId,
    user.roomName,
    user.roomSlug,
    user.roomChannel,
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
        id: user.socketId,

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
      };
    });
}

module.exports = {
  getCurrentUser,
  getRoomUsers,
  userJoin,
  userLeave,
};