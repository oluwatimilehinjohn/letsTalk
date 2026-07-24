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

const {
  generateUniqueInviteCode,
  hashInviteCode,
  normalizeInviteCode,
} = require(
  "../services/inviteCodeService"
);

function cleanText(value) {
  return String(
    value || ""
  ).trim();
}

function sendRoomError(
  response,
  error,
  fallbackMessage
) {
  if (
    error?.code === 11000
  ) {
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
    error:
      fallbackMessage,
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
            visibility:
              "public",
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
      rooms:
        rooms.map(
          (room) => {
            return serializeRoom(
              room,
              userId
            );
          }
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
        request.params
          .identifier
      );

    if (!room) {
      response
        .status(404)
        .json({
          error:
            "Room not found.",
        });

      return;
    }

    if (
      !canViewRoom(
        room,
        userId
      )
    ) {
      response
        .status(403)
        .json({
          error:
            "You do not have access to this room.",
        });

      return;
    }

    response.json({
      room:
        serializeRoom(
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
      response
        .status(400)
        .json({
          error:
            "Room names must contain between 2 and 50 characters.",
        });

      return;
    }

    if (
      description.length >
      160
    ) {
      response
        .status(400)
        .json({
          error:
            "Room descriptions cannot exceed 160 characters.",
        });

      return;
    }

    if (
      visibility ===
      "private"
    ) {
      joinPolicy =
        "invite";
    }

    const existingRoom =
      await Room.exists({
        nameLower:
          name.toLowerCase(),
      });

    if (existingRoom) {
      response
        .status(409)
        .json({
          error:
            "A room with that name already exists.",
        });

      return;
    }

    const slug =
      await createUniqueRoomSlug(
        name
      );

    let inviteCode = null;
    let inviteCodeHash = null;
    let inviteCodeCreatedAt =
      null;

    if (
      joinPolicy ===
      "invite"
    ) {
      const generatedCode =
        await generateUniqueInviteCode();

      inviteCode =
        generatedCode.inviteCode;

      inviteCodeHash =
        generatedCode
          .inviteCodeHash;

      inviteCodeCreatedAt =
        new Date();
    }

    const room =
      await Room.create({
        name,

        nameLower:
          name.toLowerCase(),

        slug,

        description,

        visibility,

        joinPolicy,

        inviteCodeHash,

        inviteCodeCreatedAt,

        createdBy:
          userId,

        members: [
          {
            userId,

            role:
              "owner",

            joinedAt:
              new Date(),
          },
        ],

        isSystem:
          false,

        isArchived:
          false,
      });

    const result = {
      room:
        serializeRoom(
          room,
          userId
        ),
    };

    if (inviteCode) {
      result.inviteCode =
        inviteCode;
    }

    response
      .status(201)
      .json(result);
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
        request.params
          .identifier
      );

    if (!room) {
      response
        .status(404)
        .json({
          error:
            "Room not found.",
        });

      return;
    }

    const updatedRoom =
      await ensureRoomMembership(
        room,
        userId
      );

    response.json({
      room:
        serializeRoom(
          updatedRoom,
          userId
        ),
    });
  } catch (error) {
    if (
      error.message ===
      "This room requires an invitation."
    ) {
      response
        .status(403)
        .json({
          error:
            error.message,
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

async function joinRoomWithCode(
  request,
  response
) {
  try {
    const userId =
      request.session.userId;

    const inviteCode =
      normalizeInviteCode(
        request.body
          .inviteCode
      );

    if (
      inviteCode.length !== 8
    ) {
      response
        .status(400)
        .json({
          error:
            "Enter a valid 8-character invite code.",
        });

      return;
    }

    const inviteCodeHash =
      hashInviteCode(
        inviteCode
      );

    const room =
      await Room.findOne({
        inviteCodeHash,

        isArchived:
          false,

        joinPolicy:
          "invite",
      }).select(
        "+inviteCodeHash"
      );

    if (!room) {
      response
        .status(403)
        .json({
          error:
            "The invite code is invalid or has expired.",
        });

      return;
    }

    const existingMember =
      getRoomMember(
        room,
        userId
      );

    if (existingMember) {
      response.json({
        room:
          serializeRoom(
            room,
            userId
          ),
      });

      return;
    }

    const updatedRoom =
      await Room.findOneAndUpdate(
        {
          _id:
            room._id,

          "members.userId": {
            $ne: userId,
          },
        },
        {
          $push: {
            members: {
              userId,

              role:
                "member",

              joinedAt:
                new Date(),
            },
          },
        },
        {
          new: true,
        }
      );

    const finalRoom =
      updatedRoom ||
      (await Room.findById(
        room._id
      ));

    response.json({
      room:
        serializeRoom(
          finalRoom,
          userId
        ),
    });
  } catch (error) {
    sendRoomError(
      response,
      error,
      "Unable to join the room."
    );
  }
}

async function regenerateInviteCode(
  request,
  response
) {
  try {
    const userId =
      request.session.userId;

    const room =
      await findRoomByIdentifier(
        request.params
          .identifier
      );

    if (!room) {
      response
        .status(404)
        .json({
          error:
            "Room not found.",
        });

      return;
    }

    const membership =
      getRoomMember(
        room,
        userId
      );

    if (
      !membership ||
      membership.role !==
        "owner"
    ) {
      response
        .status(403)
        .json({
          error:
            "Only the room owner can generate a new invite code.",
        });

      return;
    }

    const generatedCode =
      await generateUniqueInviteCode();

    const createdAt =
      new Date();

    await Room.updateOne(
      {
        _id:
          room._id,
      },
      {
        $set: {
          joinPolicy:
            "invite",

          inviteCodeHash:
            generatedCode
              .inviteCodeHash,

          inviteCodeCreatedAt:
            createdAt,
        },
      }
    );

    response.json({
      inviteCode:
        generatedCode
          .inviteCode,

      inviteCodeCreatedAt:
        createdAt,
    });
  } catch (error) {
    sendRoomError(
      response,
      error,
      "Unable to generate a new invite code."
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
        request.params
          .identifier
      );

    if (!room) {
      response
        .status(404)
        .json({
          error:
            "Room not found.",
        });

      return;
    }

    const membership =
      getRoomMember(
        room,
        userId
      );

    if (!membership) {
      response
        .status(400)
        .json({
          error:
            "You are not a member of this room.",
        });

      return;
    }

    if (
      membership.role ===
      "owner"
    ) {
      response
        .status(400)
        .json({
          error:
            "The room owner cannot leave without transferring ownership.",
        });

      return;
    }

    await Room.updateOne(
      {
        _id:
          room._id,
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
  joinRoomWithCode,
  leaveRoom,
  listRooms,
  regenerateInviteCode,
};