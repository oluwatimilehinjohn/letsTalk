function serializeId(value) {
  if (!value) {
    return null;
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
}

function serializeUser(
  user,
  fallback = {}
) {
  if (!user) {
    const fallbackId =
      fallback.userId
        ? String(fallback.userId)
        : null;

    const fallbackUsername =
      fallback.username || "";

    return {
      id: fallbackId,

      username:
        fallbackUsername,

      displayName:
        fallback.displayName ||
        fallbackUsername,

      avatarUrl:
        fallback.avatarUrl || "",
    };
  }

  const username =
    user.username ||
    fallback.username ||
    "";

  return {
    id:
      serializeId(user),

    username,

    displayName:
      user.displayName ||
      fallback.displayName ||
      username,

    avatarUrl:
      user.avatarUrl ||
      fallback.avatarUrl ||
      "",
  };
}

function serializeReactions(
  reactions = []
) {
  return reactions.map((reaction) => {
    const userIds =
      Array.isArray(reaction.userIds)
        ? reaction.userIds.map(
            serializeId
          )
        : [];

    return {
      emoji:
        reaction.emoji,

      userIds,

      count:
        userIds.length,
    };
  });
}

function serializeReply(reply) {
  if (!reply) {
    return null;
  }

  const user =
    serializeUser(
      reply.userId,
      reply
    );

  return {
    id:
      serializeId(reply),

    _id:
      serializeId(reply),

    text:
      reply.text || "",

    user,

    userId:
      user.id,

    username:
      user.username,

    displayName:
      user.displayName,

    avatarUrl:
      user.avatarUrl,

    createdAt:
      reply.createdAt || null,
  };
}

function serializeMessage(
  message,
  room = {}
) {
  const messageId =
    serializeId(message);

  const user =
    serializeUser(
      message.userId,
      message
    );

  const roomId =
    serializeId(
      room.id ||
      room._id ||
      message.roomId
    );

  const roomName =
    room.name ||
    message.roomName ||
    message.room ||
    "";

  const roomSlug =
    room.slug ||
    message.roomSlug ||
    "";

  return {
    id:
      messageId,

    _id:
      messageId,

    roomId,

    room:
      roomName,

    roomName,

    roomSlug,

    text:
      message.text || "",

    user,

    userId:
      user.id,

    username:
      user.username,

    displayName:
      user.displayName,

    avatarUrl:
      user.avatarUrl,

    replyTo:
      serializeReply(
        message.replyTo
      ),

    reactions:
      serializeReactions(
        message.reactions
      ),

    isEdited:
      Boolean(
        message.isEdited
      ),

    editedAt:
      message.editedAt || null,

    createdAt:
      message.createdAt,

    updatedAt:
      message.updatedAt,
  };
}

module.exports = {
  serializeMessage,
  serializeReactions,
  serializeReply,
  serializeUser,
};