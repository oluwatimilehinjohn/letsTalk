require("dotenv").config();

const mongoose = require(
  "mongoose"
);

const connectDB = require(
  "../config/db"
);

const Message = require(
  "../models/Message"
);

const Room = require(
  "../models/Rooms"
);

async function backfillRoomActivity() {
  await connectDB();

  const latestMessages =
    await Message.aggregate([
      {
        $match: {
          roomId: {
            $type: "objectId",
          },
        },
      },

      {
        $sort: {
          roomId: 1,
          createdAt: 1,
          _id: 1,
        },
      },

      {
        $group: {
          _id: "$roomId",

          lastMessageId: {
            $last: "$_id",
          },

          lastMessageAt: {
            $last: "$createdAt",
          },
        },
      },
    ]);

  if (!latestMessages.length) {
    console.log(
      "No room activity requires backfilling."
    );

    return;
  }

  const operations =
    latestMessages.map(
      (latestMessage) => {
        return {
          updateOne: {
            filter: {
              _id:
                latestMessage._id,
            },

            update: {
              $set: {
                lastMessageId:
                  latestMessage
                    .lastMessageId,

                lastMessageAt:
                  latestMessage
                    .lastMessageAt,
              },
            },
          },
        };
      }
    );

  const result =
    await Room.bulkWrite(
      operations,
      {
        ordered: false,
      }
    );

  console.log(
    `Rooms updated: ${
      result.modifiedCount || 0
    }`
  );
}

backfillRoomActivity()
  .catch((error) => {
    console.error(
      "Room activity backfill failed:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });