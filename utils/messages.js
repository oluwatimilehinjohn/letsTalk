//allow old messages to retain original time stamp

const moment = require("moment");

function formatMessage(
  username,
  text,
  createdAt = new Date(),
  id = null
) {
  return {
    id,
    username,
    text,
    time: moment(createdAt).format("h:mm a"),
    createdAt,
  };
}

module.exports = formatMessage;