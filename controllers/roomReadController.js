const {
  findRoomByIdentifier,
  getRoomMember,
} = require(
  "../services/roomService"
);

const {
  getReadSummaryForUser,
  getRoomUnreadState,
  markRoomRead,
} = require(
  "../services/unreadMessageService"
);

const {
  getUserChannel,
} = require(
  "../sockets/services/userChannel"
);

function sendReadError(
  response,
  error,
  fallbackMessage
) {
  if (
    error.message ===
    "You are not a member of this room."
  ) {
    response.status(403).json({
      error: error.message,
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

async function getReadSummary(
  request,
  response
) {
  try {
    const userId =
      request.session.userId;

    const rooms =
      await getReadSummaryForUser(
        userId
      );

    response.json({
      rooms,
    });
  } catch (error) {
    sendReadError(
      response,
      error,
      "Unable to load unread counts."
    );
  }
}

async function getRoomUnread(
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
      !getRoomMember(
        room,
        userId
      )
    ) {
      response.status(403).json({
        error:
          "You are not a member of this room.",
      });

      return;
    }

    const unread =
      await getRoomUnreadState(
        room,
        userId
      );

    response.json(unread);
  } catch (error) {
    sendReadError(
      response,
      error,
      "Unable to load the room read state."
    );
  }
}

async function markRoomAsRead(
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

    const result =
      await markRoomRead(
        room,
        userId
      );

    const io =
      request.app.get("io");

    if (io) {
      io.to(
        getUserChannel(userId)
      ).emit(
        "roomReadUpdated",
        result
      );
    }

    response.json(result);
  } catch (error) {
    sendReadError(
      response,
      error,
      "Unable to mark the room as read."
    );
  }
}

module.exports = {
  getReadSummary,
  getRoomUnread,
  markRoomAsRead,
};