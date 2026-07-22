const moment = require("moment");

function formatMessage(
  username,
  text,
  createdAt = new Date(),
  id = null,
  userId = null
) {
  return {
    id,
    userId,
    username,
    text,
    time: moment(createdAt).format("h:mm a"),
    createdAt,
  };
}

module.exports = formatMessage;