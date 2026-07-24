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