const eventBus = require("../events/eventBus");
const mongoose = require(
  "mongoose"
);

const Room = require(
  "../models/Rooms"
);

const {
  DEFAULT_ROOMS,
} = require(
  "../config/chat"
);

function createRoomSlug(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9\s-]/g,
      ""
    )
    .replace(
      /[\s_-]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(0, 60);
}

async function createUniqueRoomSlug(
  name
) {
  const baseSlug =
    createRoomSlug(name);

  if (!baseSlug) {
    throw new Error(
      "Enter a valid room name."
    );
  }

  let slug = baseSlug;
  let suffix = 2;

  while (
    await Room.exists({ slug })
  ) {
    slug =
      `${baseSlug}-${suffix}`;

    suffix += 1;
  }

  return slug;
}

function getRoomMember(
  room,
  userId
) {
  if (
    !room ||
    !Array.isArray(room.members)
  ) {
    return null;
  }

  const normalizedUserId =
    String(userId);

  return (
    room.members.find(
      (member) => {
        return (
          String(member.userId) ===
          normalizedUserId
        );
      }
    ) || null
  );
}

function canViewRoom(
  room,
  userId
) {
  if (
    room.visibility === "public"
  ) {
    return true;
  }

  return Boolean(
    getRoomMember(
      room,
      userId
    )
  );
}

function findRoomByIdentifier(
  identifier,
  {
    includeInviteCodeHash =
      false,
  } = {}
) {
  const cleanIdentifier =
    String(identifier || "")
      .trim();

  if (!cleanIdentifier) {
    return null;
  }

  const normalizedIdentifier =
    cleanIdentifier.toLowerCase();

  const conditions = [
    {
      slug:
        normalizedIdentifier,
    },
    {
      nameLower:
        normalizedIdentifier,
    },
  ];

  if (
    mongoose.isValidObjectId(
      cleanIdentifier
    )
  ) {
    conditions.push({
      _id: cleanIdentifier,
    });
  }

  const query =
    Room.findOne({
      isArchived: false,

      $or: conditions,
    });

  if (
    includeInviteCodeHash
  ) {
    query.select(
      "+inviteCodeHash"
    );
  }

  return query;
}

async function ensureRoomMembership(
  room,
  userId
) {
  const existingMember =
    getRoomMember(
      room,
      userId
    );

  if (existingMember) {
    return room;
  }

  const canJoin =
    room.visibility ===
      "public" &&
    room.joinPolicy ===
      "open";

  if (!canJoin) {
    throw new Error(
      "This room requires an invitation."
    );
  }

  const updatedRoom =
    await Room.findOneAndUpdate(
      {
        _id: room._id,

        "members.userId": {
          $ne: userId,
        },
      },
      {
        $push: {
          members: {
            userId,

            role: "member",

            joinedAt:
              new Date(),
          },
        },
      },
      {
        new: true,
      }
    );

  if (updatedRoom) {
    await eventBus.publish("room.member.joined", { actorUserId: userId, roomId: room._id });
    return updatedRoom;
  }

  return Room.findById(
    room._id
  );
}

function serializeRoom(
  room,
  userId
) {
  const member =
    getRoomMember(
      room,
      userId
    );

  // Room activity already records lastMessageId/lastMessageAt. Project only
  // that small piece of data for the inbox instead of coupling the room list
  // to message-history loading.
  const message = room.lastMessageId;
  const hasMessage = Boolean(message?._id);
  const messageUser = hasMessage && message.userId?._id
    ? message.userId
    : null;
  const lastMessage = hasMessage
    ? {
      id: String(message._id),
      text: message.isDeleted
        ? "This message was deleted."
        : message.text || "",
      isDeleted: Boolean(message.isDeleted),
      createdAt: message.createdAt || room.lastMessageAt || null,
      sender: messageUser
        ? {
          id: String(messageUser._id),
          username: messageUser.username || "",
          displayName: messageUser.displayName || messageUser.username || "",
          avatarUrl: messageUser.avatarUrl || "",
        }
        : null,
    }
    : null;

  return {
    id:
      room._id.toString(),

    name:
      room.name,

    slug:
      room.slug,

    description:
      room.description || "",

    visibility:
      room.visibility,

    joinPolicy:
      room.joinPolicy,

    isSystem:
      room.isSystem,

    isMember:
      Boolean(member),

    role:
      member?.role || null,

    memberCount:
      Array.isArray(
        room.members
      )
        ? room.members.length
        : 0,

    lastMessage,

    lastMessagePreview:
      lastMessage?.text || "",

    lastMessageAt:
      room.lastMessageAt ||
      lastMessage?.createdAt ||
      null,

    createdAt:
      room.createdAt,

    updatedAt:
      room.updatedAt,
  };
}

async function seedDefaultRooms() {
  for (
    const defaultRoom
    of DEFAULT_ROOMS
  ) {
    const nameLower =
      defaultRoom.name
        .toLowerCase();

    await Room.updateOne(
      {
        nameLower,
      },
      {
        $set: {
          name:
            defaultRoom.name,

          nameLower,

          slug:
            defaultRoom.slug,

          description:
            defaultRoom.description,

          visibility:
            "public",

          joinPolicy:
            "open",

          isSystem:
            true,

          isArchived:
            false,
        },

        $setOnInsert: {
          createdBy:
            null,

          members:
            [],
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log(
    "Default rooms are ready."
  );
}

module.exports = {
  canViewRoom,
  createRoomSlug,
  createUniqueRoomSlug,
  ensureRoomMembership,
  findRoomByIdentifier,
  getRoomMember,
  seedDefaultRooms,
  serializeRoom,
};
