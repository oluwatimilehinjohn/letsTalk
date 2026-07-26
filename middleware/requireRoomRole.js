const {
  findRoomByIdentifier,
  getRoomMember,
} = require("../services/roomService");

function requireRoomRole(...allowedRoles) {
  return async function checkRoomRole(
    request,
    response,
    next
  ) {
    try {
      const userId =
        request.session?.userId;

      if (!userId) {
        response.status(401).json({
          error:
            "You must be logged in.",
        });

        return;
      }

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
        response.status(403).json({
          error:
            "You are not a member of this room.",
        });

        return;
      }

      if (
        !allowedRoles.includes(
          membership.role
        )
      ) {
        response.status(403).json({
          error:
            "You do not have permission to manage this room.",
        });

        return;
      }

      request.room = room;

      request.roomMembership =
        membership;

      next();
    } catch (error) {
      console.error(
        "Room permission error:",
        error
      );

      response.status(500).json({
        error:
          "Unable to verify room permissions.",
      });
    }
  };
}

module.exports = requireRoomRole;