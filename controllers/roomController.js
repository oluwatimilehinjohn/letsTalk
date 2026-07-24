const Room = require(
  "../models/Rooms"
);

const {
  canViewRoom,
  createUniqueRoomSlug,
  ensureRoomMembership,
  findRoomByIdentifier,
  getRoomMember,
  serializeRoom,
} = require(
  "../services/roomService"
);

function cleanText(value) {
  return String(value || "").trim();
}

function sendRoomError(
  response,
  error,
  fallbackMessage
) {
  if (error?.code === 11000) {
    response.status(409).json({
      error:
        "A room with that name already exists.",
    });

    return;
  }

  console.error(
    fallbackMessage,
    error
  );

  response.status(500).json({
    error: fallbackMessage,
  });
}

async function listRooms(
  request,
  response
) {
  try {
    const userId =
      request.session.userId;

    const rooms =
      await Room.find({
        isArchived: false,

        $or: [
          {
            visibility: "public",
          },
          {
            "members.userId":
              userId,
          },
        ],
      }).sort({
        isSystem: -1,
        name: 1,
      });

    response.json({
      rooms: rooms.map((room) =>
        serializeRoom(
          room,
          userId
        )
      ),
    });
  } catch (error) {
    sendRoomError(
      response,
      error,
      "Unable to load rooms."
    );
  }
}

async function getRoom(
  request,
  response
) {
  try {
    const userId =
      request.session.userId;

    const room =
      await findRoomByIdentifier(
        request.params.identifier
      );

    if (!room) {
      response.status(404).json({
        error: "Room not found.",
      });

      return;
    }

    if (
      !canViewRoom(room, userId)
    ) {
      response.status(403).json({
        error:
          "You do not have access to this room.",
      });

      return;
    }

    response.json({
      room: serializeRoom(
        room,
        userId
      ),
    });
  } catch (error) {
    sendRoomError(
      response,
      error,
      "Unable to load the room."
    );
  }
}

async function createRoom(
  request,
  response
) {
  try {
    const userId =
      request.session.userId;

    const name =
      cleanText(
        request.body.name
      );

    const description =
      cleanText(
        request.body.description
      );

    const visibility =
      request.body.visibility ===
      "private"
        ? "private"
        : "public";

    let joinPolicy =
      request.body.joinPolicy ===
      "invite"
        ? "invite"
        : "open";

    if (
      name.length < 2 ||
      name.length > 50
    ) {
      response.status(400).json({
        error:
          "Room names must contain between 2 and 50 characters.",
      });

      return;
    }

    if (
      description.length > 160
    ) {
      response.status(400).json({
        error:
          "Room descriptions cannot exceed 160 characters.",
      });

      return;
    }

    if (
      visibility === "private"
    ) {
      joinPolicy = "invite";
    }

    const slug =
      await createUniqueRoomSlug(
        name
      );

    const room =
      await Room.create({
        name,

        nameLower:
          name.toLowerCase(),

        slug,

        description,

        visibility,

        joinPolicy,

        createdBy: userId,

        members: [
          {
            userId,
            role: "owner",
          },
        ],
      });

    response.status(201).json({
      room: serializeRoom(
        room,
        userId
      ),
    });
  } catch (error) {
    sendRoomError(
      response,
      error,
      "Unable to create the room."
    );
  }
}

async function joinRoom(
  request,
  response
) {
  try {
    const userId =
      request.session.userId;

    const room =
      await findRoomByIdentifier(
        request.params.identifier
      );

    if (!room) {
      response.status(404).json({
        error: "Room not found.",
      });

      return;
    }

    const updatedRoom =
      await ensureRoomMembership(
        room,
        userId
      );

    response.json({
      room: serializeRoom(
        updatedRoom,
        userId
      ),
    });
  } catch (error) {
    if (
      error.message ===
      "This room requires an invitation."
    ) {
      response.status(403).json({
        error: error.message,
      });

      return;
    }

    sendRoomError(
      response,
      error,
      "Unable to join the room."
    );
  }
}

async function leaveRoom(
  request,
  response
) {
  try {
    const userId =
      request.session.userId;

    const room =
      await findRoomByIdentifier(
        request.params.identifier
      );

    if (!room) {
      response.status(404).json({
        error: "Room not found.",
      });

      return;
    }

    const membership =
      getRoomMember(
        room,
        userId
      );

    if (!membership) {
      response.status(400).json({
        error:
          "You are not a member of this room.",
      });

      return;
    }

    if (
      membership.role === "owner"
    ) {
      response.status(400).json({
        error:
          "The room owner cannot leave without transferring ownership.",
      });

      return;
    }

    await Room.updateOne(
      {
        _id: room._id,
      },
      {
        $pull: {
          members: {
            userId,
          },
        },
      }
    );

    response.json({
      success: true,
    });
  } catch (error) {
    sendRoomError(
      response,
      error,
      "Unable to leave the room."
    );
  }
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  listRooms,
};