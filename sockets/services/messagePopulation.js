const USER_FIELDS =
  "username displayName avatarUrl";

const MESSAGE_POPULATION = [
  {
    path: "userId",

    select: USER_FIELDS,
  },

  {
    path: "replyTo",

    select:
      "text userId createdAt isDeleted deletedAt",

    populate: {
      path: "userId",

      select: USER_FIELDS,
    },
  },
];

module.exports = {
  MESSAGE_POPULATION,
  USER_FIELDS,
};