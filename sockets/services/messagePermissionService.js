const Room = require(
  "../../models/Rooms"
);

function normalizeId(value) {
  return String(
    value?._id ||
    value ||
    ""
  );
}

function isMessageOwner(
  message,
  userId
) {
  return (
    normalizeId(
      message.userId
    ) ===
    normalizeId(userId)
  );
}

async function getRoomMembership(
  roomId,
  userId
) {
  const room =
    await Room.findOne({
      _id: roomId,

      "members.userId":
        userId,

      isArchived:
        false,
    }).select(
      "members"
    );

  if (!room) {
    return null;
  }

  return (
    room.members.find(
      (member) => {
        return (
          normalizeId(
            member.userId
          ) ===
          normalizeId(
            userId
          )
        );
      }
    ) || null
  );
}

async function canDeleteMessage(
  message,
  userId
) {
  if (
    isMessageOwner(
      message,
      userId
    )
  ) {
    return {
      allowed: true,

      deletionType:
        "self",

      role:
        "member",
    };
  }

  const membership =
    await getRoomMembership(
      message.roomId,
      userId
    );

  if (
    !membership ||
    ![
      "owner",
      "admin",
    ].includes(
      membership.role
    )
  ) {
    return {
      allowed: false,

      deletionType:
        null,

      role:
        membership?.role ||
        null,
    };
  }

  return {
    allowed: true,

    deletionType:
      "moderator",

    role:
      membership.role,
  };
}

module.exports = {
  canDeleteMessage,
  getRoomMembership,
  isMessageOwner,
  normalizeId,
};