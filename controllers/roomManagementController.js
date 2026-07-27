const Room = require(
  "../models/Rooms"
);

const {
  generateUniqueInviteCode,
} = require(
  "../services/inviteCodeService"
);

const {
  getRoomMember,
  serializeRoom,
} = require(
  "../services/roomService"
);

function cleanText(value) {
  return String(value || "").trim();
}

function sendManagementError(
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

function serializeMember(member) {
  const user = member.userId;

  if (!user) {
    return null;
  }

  return {
    userId:
      user._id.toString(),

    username:
      user.username,

    displayName:
      user.displayName ||
      user.username,

    avatarUrl:
      user.avatarUrl || "",

    role:
      member.role,

    joinedAt:
      member.joinedAt,
  };
}

async function updateRoom(
  request,
  response
) {
  try {
    const userId =
      request.session.userId;

    const room =
      await Room.findById(
        request.room._id
      ).select(
        "+inviteCodeHash"
      );

    if (!room) {
      response.status(404).json({
        error: "Room not found.",
      });

      return;
    }

    const name = cleanText(
      request.body.name
    );

    const description =
      cleanText(
        request.body.description
      );

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

    const duplicateRoom =
      await Room.exists({
        _id: {
          $ne: room._id,
        },

        nameLower:
          name.toLowerCase(),
      });

    if (duplicateRoom) {
      response.status(409).json({
        error:
          "A room with that name already exists.",
      });

      return;
    }

    room.name = name;
    room.description = description;

    let inviteCode = null;

    const isOwner =
      request.roomMembership.role ===
      "owner";

    if (isOwner) {
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
        visibility === "private"
      ) {
        joinPolicy = "invite";
      }

      room.visibility =
        visibility;

      room.joinPolicy =
        joinPolicy;

      if (
        joinPolicy === "invite" &&
        !room.inviteCodeHash
      ) {
        const generatedCode =
          await generateUniqueInviteCode();

        inviteCode =
          generatedCode.inviteCode;

        room.inviteCodeHash =
          generatedCode.inviteCodeHash;

        room.inviteCodeCreatedAt =
          new Date();
      }

      if (
        joinPolicy === "open"
      ) {
        room.inviteCodeHash = null;

        room.inviteCodeCreatedAt =
          null;
      }
    }

    await room.save();

    const result = {
      room: serializeRoom(
        room,
        userId
      ),
    };

    if (inviteCode) {
      result.inviteCode =
        inviteCode;
    }

    response.json(result);
  } catch (error) {
    sendManagementError(
      response,
      error,
      "Unable to update the room."
    );
  }
}

async function listRoomMembers(
  request,
  response
) {
  try {
    const room =
      await Room.findById(
        request.room._id
      ).populate({
        path:
          "members.userId",

        select:
          "username displayName avatarUrl",
      });

    if (!room) {
      response.status(404).json({
        error: "Room not found.",
      });

      return;
    }

    const members =
      room.members
        .map(serializeMember)
        .filter(Boolean)
        .sort((first, second) => {
          const roleOrder = {
            owner: 0,
            admin: 1,
            member: 2,
          };

          const roleDifference =
            roleOrder[first.role] -
            roleOrder[second.role];

          if (roleDifference !== 0) {
            return roleDifference;
          }

          return first.displayName.localeCompare(
            second.displayName
          );
        });

    response.json({
      members,
    });
  } catch (error) {
    sendManagementError(
      response,
      error,
      "Unable to load room members."
    );
  }
}

async function updateMemberRole(
  request,
  response
) {
  try {
    const room =
      await Room.findById(
        request.room._id
      );

    if (!room) {
      response.status(404).json({
        error: "Room not found.",
      });

      return;
    }

    const targetUserId =
      request.params.userId;

    const role =
      request.body.role;

    if (
      !["admin", "member"].includes(
        role
      )
    ) {
      response.status(400).json({
        error:
          "The selected member role is invalid.",
      });

      return;
    }

    const targetMember =
      getRoomMember(
        room,
        targetUserId
      );

    if (!targetMember) {
      response.status(404).json({
        error:
          "That user is not a room member.",
      });

      return;
    }

    if (
      targetMember.role === "owner"
    ) {
      response.status(400).json({
        error:
          "The room owner's role cannot be changed here.",
      });

      return;
    }

    targetMember.role = role;

    await room.save();

    response.json({
      success: true,

      member: {
        userId:
          targetUserId,

        role,
      },
    });
  } catch (error) {
    sendManagementError(
      response,
      error,
      "Unable to update the member role."
    );
  }
}

async function removeRoomMember(
  request,
  response
) {
  try {
    const currentUserId =
      String(
        request.session.userId
      );

    const targetUserId =
      String(
        request.params.userId
      );

    if (
      currentUserId ===
      targetUserId
    ) {
      response.status(400).json({
        error:
          "Use the leave-room option to remove yourself.",
      });

      return;
    }

    const room =
      await Room.findById(
        request.room._id
      );

    if (!room) {
      response.status(404).json({
        error: "Room not found.",
      });

      return;
    }

    const targetMember =
      getRoomMember(
        room,
        targetUserId
      );

    if (!targetMember) {
      response.status(404).json({
        error:
          "That user is not a room member.",
      });

      return;
    }

    if (
      targetMember.role === "owner"
    ) {
      response.status(400).json({
        error:
          "The room owner cannot be removed.",
      });

      return;
    }

    const currentRole =
      request.roomMembership.role;

    if (
      currentRole === "admin" &&
      targetMember.role !== "member"
    ) {
      response.status(403).json({
        error:
          "Admins can only remove regular members.",
      });

      return;
    }

    room.members =
      room.members.filter(
        (member) => {
          return (
            String(member.userId) !==
            targetUserId
          );
        }
      );

    await room.save();

    response.json({
      success: true,
    });
  } catch (error) {
    sendManagementError(
      response,
      error,
      "Unable to remove the room member."
    );
  }
}

async function transferOwnership(
  request,
  response
) {
  try {
    const currentUserId =
      String(
        request.session.userId
      );

    const targetUserId =
      String(
        request.body.userId || ""
      );

    if (!targetUserId) {
      response.status(400).json({
        error:
          "Select a member to receive ownership.",
      });

      return;
    }

    if (
      currentUserId ===
      targetUserId
    ) {
      response.status(400).json({
        error:
          "You already own this room.",
      });

      return;
    }

    const room =
      await Room.findById(
        request.room._id
      );

    if (!room) {
      response.status(404).json({
        error: "Room not found.",
      });

      return;
    }

    const currentOwner =
      getRoomMember(
        room,
        currentUserId
      );

    const newOwner =
      getRoomMember(
        room,
        targetUserId
      );

    if (
      !currentOwner ||
      currentOwner.role !== "owner"
    ) {
      response.status(403).json({
        error:
          "Only the current owner can transfer ownership.",
      });

      return;
    }

    if (!newOwner) {
      response.status(404).json({
        error:
          "The selected user is not a room member.",
      });

      return;
    }

    currentOwner.role = "admin";
    newOwner.role = "owner";

    room.createdBy =
      newOwner.userId;

    await room.save();

    response.json({
      success: true,

      newOwnerId:
        targetUserId,
    });
  } catch (error) {
    sendManagementError(
      response,
      error,
      "Unable to transfer room ownership."
    );
  }
}

async function archiveRoom(
  request,
  response
) {
  try {
    const room =
      await Room.findById(
        request.room._id
      );

    if (!room) {
      response.status(404).json({
        error: "Room not found.",
      });

      return;
    }

    if (room.isSystem) {
      response.status(400).json({
        error:
          "Official rooms cannot be archived.",
      });

      return;
    }

    room.isArchived = true;

    await room.save();

    response.json({
      success: true,
    });
  } catch (error) {
    sendManagementError(
      response,
      error,
      "Unable to archive the room."
    );
  }
}

module.exports = {
  archiveRoom,
  listRoomMembers,
  removeRoomMember,
  transferOwnership,
  updateMemberRole,
  updateRoom,
};