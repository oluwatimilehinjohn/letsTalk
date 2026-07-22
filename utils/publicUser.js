function publicUser(user) {
  return {
    id: user._id.toString(),

    username: user.username,

    displayName:
      user.displayName ||
      user.username,

    email: user.email,

    avatarUrl:
      user.avatarUrl || null,

    bio: user.bio || "",

    lastSeenAt:
      user.lastSeenAt || null,

    createdAt: user.createdAt,
  };
}

module.exports = publicUser;