require("dotenv").config();

const mongoose = require(
  "mongoose"
);

const connectDB = require(
  "../config/db"
);

const Room = require(
  "../models/Rooms"
);

const Message = require(
  "../models/Message"
);

function normalizeRoomValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function addRoomAliases(
  lookup,
  room
) {
  const roomId =
    String(room._id);

  const aliases = [
    roomId,
    room.name,
    room.nameLower,
    room.slug,
  ]
    .filter(Boolean)
    .map(
      normalizeRoomValue
    );

  if (
    room.name === "C#" ||
    room.slug === "c-sharp"
  ) {
    aliases.push(
      "c#",
      "c",
      "c-sharp",
      "csharp"
    );
  }

  aliases.forEach((alias) => {
    lookup.set(
      alias,
      room
    );
  });
}

async function flushOperations(
  operations
) {
  if (!operations.length) {
    return 0;
  }

  const result =
    await Message.collection.bulkWrite(
      operations,
      {
        ordered: false,
      }
    );

  return (
    result.modifiedCount ||
    result.matchedCount ||
    0
  );
}

async function migrateMessages() {
  await connectDB();

  await Room.init();

  const rooms =
    await Room.find({
      isArchived: false,
    }).lean();

  if (!rooms.length) {
    throw new Error(
      "No rooms were found. Start the app once so the default rooms can be seeded."
    );
  }

  const roomLookup =
    new Map();

  rooms.forEach((room) => {
    addRoomAliases(
      roomLookup,
      room
    );
  });

  const query = {
    $or: [
      {
        roomId: {
          $exists: false,
        },
      },

      {
        roomId: null,
      },
    ],
  };

  const cursor =
    Message.collection.find(
      query
    );

  let scanned = 0;
  let migrated = 0;

  const unmatchedRooms =
    new Map();

  let operations = [];

  for await (
    const message of cursor
  ) {
    scanned += 1;

    const legacyRoomValue =
      message.room ||
      message.roomName ||
      message.roomSlug ||
      "";

    const normalizedLegacyRoom =
      normalizeRoomValue(
        legacyRoomValue
      );

    const room =
      roomLookup.get(
        normalizedLegacyRoom
      );

    if (!room) {
      const displayValue =
        legacyRoomValue ||
        "(empty room value)";

      unmatchedRooms.set(
        displayValue,
        (
          unmatchedRooms.get(
            displayValue
          ) || 0
        ) + 1
      );

      continue;
    }

    operations.push({
      updateOne: {
        filter: {
          _id:
            message._id,
        },

        update: {
          $set: {
            roomId:
              room._id,
          },
        },
      },
    });

    if (
      operations.length >= 500
    ) {
      migrated +=
        await flushOperations(
          operations
        );

      operations = [];
    }
  }

  migrated +=
    await flushOperations(
      operations
    );

  console.log(
    `Messages scanned: ${scanned}`
  );

  console.log(
    `Messages migrated: ${migrated}`
  );

  if (unmatchedRooms.size) {
    console.log(
      "\nMessages with unmatched room values:"
    );

    for (
      const [
        roomValue,
        count,
      ] of unmatchedRooms
    ) {
      console.log(
        `- ${roomValue}: ${count}`
      );
    }

    console.log(
      "\nThose messages were not changed."
    );

    process.exitCode = 1;
  } else {
    console.log(
      "All existing messages now use room IDs."
    );
  }
}

migrateMessages()
  .catch((error) => {
    console.error(
      "Message migration failed:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });