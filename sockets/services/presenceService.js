const DirectConversation = require(
  "../../models/DirectConversation"
);

const {
  getUserChannel,
} = require(
  "./userChannel"
);

const socketUsers =
  new Map();

const userSockets =
  new Map();

function normalizeId(value) {
  return String(
    value?._id ||
    value ||
    ""
  ).trim();
}

function registerPresenceSocket(
  socketId,
  userId
) {
  const normalizedSocketId =
    normalizeId(socketId);

  const normalizedUserId =
    normalizeId(userId);

  if (
    !normalizedSocketId ||
    !normalizedUserId
  ) {
    return {
      becameOnline: false,
    };
  }

  const wasOnline =
    isUserOnline(
      normalizedUserId
    );

  socketUsers.set(
    normalizedSocketId,
    normalizedUserId
  );

  if (
    !userSockets.has(
      normalizedUserId
    )
  ) {
    userSockets.set(
      normalizedUserId,
      new Set()
    );
  }

  userSockets
    .get(normalizedUserId)
    .add(normalizedSocketId);

  return {
    becameOnline:
      !wasOnline,
  };
}

function unregisterPresenceSocket(
  socketId
) {
  const normalizedSocketId =
    normalizeId(socketId);

  const userId =
    socketUsers.get(
      normalizedSocketId
    );

  if (!userId) {
    return {
      userId: null,
      becameOffline: false,
    };
  }

  socketUsers.delete(
    normalizedSocketId
  );

  const sockets =
    userSockets.get(userId);

  if (sockets) {
    sockets.delete(
      normalizedSocketId
    );

    if (sockets.size === 0) {
      userSockets.delete(
        userId
      );
    }
  }

  return {
    userId,

    becameOffline:
      !isUserOnline(userId),
  };
}

function isUserOnline(userId) {
  const normalizedUserId =
    normalizeId(userId);

  if (!normalizedUserId) {
    return false;
  }

  return Boolean(
    userSockets.get(
      normalizedUserId
    )?.size
  );
}

function getUserSocketIds(userId) {
  const normalizedUserId =
    normalizeId(userId);

  if (!normalizedUserId) {
    return [];
  }

  return Array.from(
    userSockets.get(
      normalizedUserId
    ) || []
  );
}

async function getDirectContactIds(
  userId
) {
  const normalizedUserId =
    normalizeId(userId);

  const conversations =
    await DirectConversation.find({
      isArchived: false,

      "participants.userId":
        normalizedUserId,
    })
      .select(
        "participants.userId"
      )
      .lean();

  const contactIds =
    new Set();

  for (
    const conversation
    of conversations
  ) {
    for (
      const participant
      of conversation.participants
    ) {
      const participantId =
        normalizeId(
          participant.userId
        );

      if (
        participantId &&
        participantId !==
          normalizedUserId
      ) {
        contactIds.add(
          participantId
        );
      }
    }
  }

  return contactIds;
}

async function emitPresenceToContacts(
  io,
  userId,
  isOnline
) {
  const normalizedUserId =
    normalizeId(userId);

  if (!normalizedUserId) {
    return;
  }

  const contactIds =
    await getDirectContactIds(
      normalizedUserId
    );

  /*
   * Notify the user's other tabs too.
   */
  contactIds.add(
    normalizedUserId
  );

  const payload = {
    userId:
      normalizedUserId,

    isOnline:
      Boolean(isOnline),
  };

  for (
    const contactId
    of contactIds
  ) {
    io.to(
      getUserChannel(
        contactId
      )
    ).emit(
      "directPresenceUpdated",
      payload
    );
  }
}

async function getPresenceSnapshot(
  requesterUserId,
  requestedUserIds
) {
  const normalizedRequesterId =
    normalizeId(
      requesterUserId
    );

  const contacts =
    await getDirectContactIds(
      normalizedRequesterId
    );

  const uniqueRequestedIds =
    Array.from(
      new Set(
        (
          Array.isArray(
            requestedUserIds
          )
            ? requestedUserIds
            : []
        )
          .map(normalizeId)
          .filter(Boolean)
      )
    ).slice(0, 100);

  return uniqueRequestedIds
    .filter((userId) => {
      return (
        userId ===
          normalizedRequesterId ||
        contacts.has(userId)
      );
    })
    .map((userId) => {
      return {
        userId,

        isOnline:
          isUserOnline(
            userId
          ),
      };
    });
}

module.exports = {
  emitPresenceToContacts,
  getDirectContactIds,
  getPresenceSnapshot,
  getUserSocketIds,
  isUserOnline,
  registerPresenceSocket,
  unregisterPresenceSocket,
};