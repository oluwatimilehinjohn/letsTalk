const moment = require("moment");

function formatMessage(
  username,
  text,
  createdAt = new Date(),
  id = null,
  userId = null,
  author = {}
) {
  return {
    id,
    userId,

    username,

    displayName:
      author.displayName ||
      username,

    avatarUrl:
      author.avatarUrl || null,

    text,

    time: moment(createdAt).format(
      "h:mm a"
    ),

    createdAt,

    replyTo: null,

    reactions: [],
  };
}

module.exports = formatMessage;