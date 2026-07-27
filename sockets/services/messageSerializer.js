const DELETED_MESSAGE_TEXT =
  "This message was deleted.";

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
        ? String(
            fallback.userId
          )
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
  return reactions.map(
    (reaction) => {
      const userIds =
        Array.isArray(
          reaction.userIds
        )
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
    }
  );
}

function serializeReply(reply) {
  if (!reply) {
    return null;
  }

  const isDeleted =
    Boolean(
      reply.isDeleted
    );

  const user =
    serializeUser(
      reply.userId,
      reply
    );

  const replyId =
    serializeId(reply);

  return {
    id:
      replyId,

    _id:
      replyId,

    text:
      isDeleted
        ? DELETED_MESSAGE_TEXT
        : reply.text || "",

    user,

    userId:
      user.id,

    username:
      user.username,

    displayName:
      user.displayName,

    avatarUrl:
      user.avatarUrl,

    isDeleted,

    deletedAt:
      reply.deletedAt || null,

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

  const isDeleted =
    Boolean(
      message.isDeleted
    );

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
      isDeleted
        ? DELETED_MESSAGE_TEXT
        : message.text || "",

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
      isDeleted
        ? []
        : serializeReactions(
            message.reactions
          ),

    isEdited:
      !isDeleted &&
      Boolean(
        message.isEdited
      ),

    editedAt:
      isDeleted
        ? null
        : message.editedAt ||
          null,

    isDeleted,

    deletedAt:
      message.deletedAt ||
      null,

    deletionType:
      message.deletionType ||
      null,

    createdAt:
      message.createdAt,

    updatedAt:
      message.updatedAt,
  };
}

module.exports = {
  DELETED_MESSAGE_TEXT,
  serializeMessage,
  serializeReactions,
  serializeReply,
  serializeUser,
};