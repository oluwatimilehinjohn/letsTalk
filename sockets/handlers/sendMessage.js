const mongoose = require(
  "mongoose"
);

const Message = require(
  "../../models/Message"
);

const Room = require(
  "../../models/Rooms"
);

const {
  getCurrentUser,
  getUserSockets,
} = require(
  "../../utils/users"
);

const {
  MESSAGE_POPULATION,
} = require(
  "../services/messagePopulation"
);

const {
  serializeMessage,
} = require(
  "../services/messageSerializer"
);

const {
  getUserChannel,
} = require(
  "../services/userChannel"
);

function sendAcknowledgement(
  acknowledgement,
  payload
) {
  if (
    typeof acknowledgement ===
    "function"
  ) {
    acknowledgement(payload);
  }
}

function getMessageText(payload) {
  if (
    typeof payload === "string"
  ) {
    return payload.trim();
  }

  return String(
    payload?.text ||
    payload?.message ||
    ""
  ).trim();
}

function getReplyId(payload) {
  if (
    !payload ||
    typeof payload !== "object"
  ) {
    return null;
  }

  return (
    payload.replyToId ||
    payload.replyTo?._id ||
    payload.replyTo?.id ||
    payload.replyTo ||
    null
  );
}

async function emitRoomActivity(
  io,
  user,
  message
) {
  const room =
    await Room.findById(
      user.roomId
    )
      .select(
        "name slug members.userId"
      )
      .lean();

  if (!room) {
    return;
  }

  const messageId =
    String(message._id);

  const lastMessageAt =
    message.createdAt;

  for (
    const membership
    of room.members
  ) {
    const memberUserId =
      String(
        membership.userId
      );

    const isSender =
      memberUserId ===
      String(user.userId);

    const activeSockets =
      getUserSockets(
        memberUserId
      );

    const isViewingRoom =
      activeSockets.some(
        (activeUser) => {
          return (
            activeUser.roomId ===
            String(room._id)
          );
        }
      );

    io.to(
      getUserChannel(
        memberUserId
      )
    ).emit(
      "roomActivity",
      {
        roomId:
          String(room._id),

        roomSlug:
          room.slug,

        roomName:
          room.name,

        messageId,

        lastMessageAt,

        senderId:
          String(user.userId),

        shouldIncrement:
          !isSender &&
          !isViewingRoom,
      }
    );
  }
}

function sendMessage(io, socket) {
  return async (
    payload = {},
    acknowledgement
  ) => {
    try {
      const user =
        getCurrentUser(
          socket.id
        );

      if (!user) {
        sendAcknowledgement(
          acknowledgement,
          {
            ok: false,

            error:
              "Join a room before sending a message.",
          }
        );

        return;
      }

      const text =
        getMessageText(payload);

      if (!text) {
        sendAcknowledgement(
          acknowledgement,
          {
            ok: false,

            error:
              "Enter a message.",
          }
        );

        return;
      }

      if (text.length > 4000) {
        sendAcknowledgement(
          acknowledgement,
          {
            ok: false,

            error:
              "Messages cannot exceed 4000 characters.",
          }
        );

        return;
      }

      const replyId =
        getReplyId(payload);

      let replyTo = null;

      if (replyId) {
        if (
          !mongoose.isValidObjectId(
            replyId
          )
        ) {
          sendAcknowledgement(
            acknowledgement,
            {
              ok: false,

              error:
                "The reply message is invalid.",
            }
          );

          return;
        }

        const replyMessage =
          await Message.findOne({
            _id: replyId,

            roomId:
              user.roomId,
          }).select("_id");

        if (!replyMessage) {
          sendAcknowledgement(
            acknowledgement,
            {
              ok: false,

              error:
                "The reply message does not belong to this room.",
            }
          );

          return;
        }

        replyTo =
          replyMessage._id;
      }

      const message =
        await Message.create({
          roomId:
            user.roomId,

          userId:
            user.userId,

          text,

          replyTo,

          reactions: [],
        });

      await Room.updateOne(
        {
          _id: user.roomId,
        },
        {
          $set: {
            lastMessageId:
              message._id,

            lastMessageAt:
              message.createdAt,
          },
        }
      );

      await message.populate(
        MESSAGE_POPULATION
      );

      const serializedMessage =
        serializeMessage(
          message,
          {
            id:
              user.roomId,

            name:
              user.roomName,

            slug:
              user.roomSlug,
          }
        );

      io.to(
        user.roomChannel
      ).emit(
        "message",
        serializedMessage
      );

      await emitRoomActivity(
        io,
        user,
        message
      );

      sendAcknowledgement(
        acknowledgement,
        {
          ok: true,

          message:
            serializedMessage,
        }
      );
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      sendAcknowledgement(
        acknowledgement,
        {
          ok: false,

          error:
            "Unable to send the message.",
        }
      );

      socket.emit(
        "messageError",
        "Unable to send the message."
      );
    }
  };
}

module.exports = sendMessage;