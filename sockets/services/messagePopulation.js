const MESSAGE_POPULATION = [
  {
    path: "userId",
    select: "username displayName avatarUrl",
  },
  {
    path: "replyTo",
    select: "username text userId createdAt",
    populate: {
      path: "userId",
      select: "username displayName avatarUrl",
    },
  },
];

async function populateMessage(message) {
  await message.populate(
    MESSAGE_POPULATION
  );

  return message;
}

module.exports = {
  MESSAGE_POPULATION,
  populateMessage,
};