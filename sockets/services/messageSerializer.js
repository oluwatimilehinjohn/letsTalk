const moment = require("moment");

function getPopulatedUser(value) {
  if (
    value &&
    typeof value === "object" &&
    value._id
  ) {
    return value;
  }

  return null;
}

function serializeReactions(
  reactions = []
) {
  return reactions.map((reaction) => ({
    emoji: reaction.emoji,

    userIds: reaction.userIds.map(
      (userId) => userId.toString()
    ),
  }));
}

function serializeReply(reply) {
  if (!reply) {
    return null;
  }

  const author = getPopulatedUser(
    reply.userId
  );

  return {
    id: reply._id.toString(),

    userId: author
      ? author._id.toString()
      : reply.userId?.toString() || null,

    username:
      author?.username ||
      reply.username,

    displayName:
      author?.displayName ||
      author?.username ||
      reply.username,

    avatarUrl:
      author?.avatarUrl || null,

    text: reply.text,

    createdAt: reply.createdAt,
  };
}

function serializeMessage(message) {
  const author = getPopulatedUser(
    message.userId
  );

  return {
    id: message._id.toString(),

    userId: author
      ? author._id.toString()
      : message.userId?.toString() || null,

    username:
      author?.username ||
      message.username,

    displayName:
      author?.displayName ||
      author?.username ||
      message.username,

    avatarUrl:
      author?.avatarUrl || null,

    text: message.text,

    time: moment(
      message.createdAt
    ).format("h:mm a"),

    createdAt: message.createdAt,

    replyTo: serializeReply(
      message.replyTo
    ),

    reactions: serializeReactions(
      message.reactions
    ),
  };
}

module.exports = {
  serializeMessage,
  serializeReactions,
};