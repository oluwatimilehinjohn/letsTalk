const Message = require(
  "../models/Message"
);

const Room = require(
  "../models/Rooms"
);

const {
  getRoomMember,
} = require(
  "./roomService"
);

function createUnreadFilter(
  roomId,
  userId,
  lastReadAt
) {
  const filter = {
    roomId,

    userId: {
      $ne: userId,
    },
  };

  if (lastReadAt) {
    filter.createdAt = {
      $gt: lastReadAt,
    };
  }

  return filter;
}

async function getRoomUnreadState(
  room,
  userId
) {
  const membership =
    getRoomMember(
      room,
      userId
    );

  if (!membership) {
    throw new Error(
      "You are not a member of this room."
    );
  }

  const unreadFilter =
    createUnreadFilter(
      room._id,
      userId,
      membership.lastReadAt
    );

  const [
    unreadCount,
    firstUnreadMessage,
    latestMessage,
  ] = await Promise.all([
    Message.countDocuments(
      unreadFilter
    ),

    Message.findOne(
      unreadFilter
    )
      .sort({
        createdAt: 1,
        _id: 1,
      })
      .select("_id createdAt")
      .lean(),

    Message.findOne({
      roomId: room._id,
    })
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .select("_id createdAt")
      .lean(),
  ]);

  return {
    roomId:
      String(room._id),

    roomSlug:
      room.slug,

    unreadCount,

    firstUnreadMessageId:
      firstUnreadMessage
        ? String(
            firstUnreadMessage._id
          )
        : null,

    lastReadMessageId:
      membership.lastReadMessageId
        ? String(
            membership
              .lastReadMessageId
          )
        : null,

    lastReadAt:
      membership.lastReadAt ||
      null,

    lastMessageId:
      latestMessage
        ? String(
            latestMessage._id
          )
        : null,

    lastMessageAt:
      latestMessage?.createdAt ||
      room.lastMessageAt ||
      null,
  };
}

async function getReadSummaryForUser(
  userId
) {
  const rooms =
    await Room.find({
      isArchived: false,

      "members.userId":
        userId,
    }).select(
      "slug members lastMessageId lastMessageAt"
    );

  const summaries =
    await Promise.all(
      rooms.map((room) => {
        return getRoomUnreadState(
          room,
          userId
        );
      })
    );

  return summaries;
}

async function markRoomRead(
  room,
  userId
) {
  const membership =
    getRoomMember(
      room,
      userId
    );

  if (!membership) {
    throw new Error(
      "You are not a member of this room."
    );
  }

  const latestMessage =
    await Message.findOne({
      roomId: room._id,
    })
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .select("_id createdAt")
      .lean();

  const lastReadAt =
    latestMessage?.createdAt ||
    new Date();

  const lastReadMessageId =
    latestMessage?._id || null;

  await Room.updateOne(
    {
      _id: room._id,

      "members.userId":
        userId,
    },
    {
      $set: {
        "members.$.lastReadMessageId":
          lastReadMessageId,

        "members.$.lastReadAt":
          lastReadAt,
      },
    }
  );

  return {
    roomId:
      String(room._id),

    roomSlug:
      room.slug,

    unreadCount: 0,

    lastReadMessageId:
      lastReadMessageId
        ? String(
            lastReadMessageId
          )
        : null,

    lastReadAt,
  };
}

module.exports = {
  getReadSummaryForUser,
  getRoomUnreadState,
  markRoomRead,
};