const users = [];

function userJoin({
  socketId,
  userId,
  username,
  displayName,
  avatarUrl,
  room,
}) {
  const existingIndex = users.findIndex(
    (user) => user.socketId === socketId
  );

  if (existingIndex !== -1) {
    users.splice(existingIndex, 1);
  }

  const user = {
    socketId,
    userId,
    username,
    displayName: displayName || username,
    avatarUrl: avatarUrl || null,
    room,
  };

  users.push(user);

  return user;
}

function getCurrentUser(socketId) {
  return users.find(
    (user) => user.socketId === socketId
  );
}

function userLeave(socketId) {
  const index = users.findIndex(
    (user) => user.socketId === socketId
  );

  if (index === -1) {
    return null;
  }

  return users.splice(index, 1)[0];
}

function getRoomUsers(room) {
  const uniqueUsers = new Map();

  users
    .filter((user) => user.room === room)
    .forEach((user) => {
      if (!uniqueUsers.has(user.userId)) {
        uniqueUsers.set(user.userId, {
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        });
      }
    });

  return Array.from(uniqueUsers.values());
}

function isUserOnline(userId) {
  return users.some(
    (user) => user.userId === userId
  );
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  isUserOnline,
};