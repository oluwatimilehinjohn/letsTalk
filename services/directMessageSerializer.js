function normalizeId(value) {
  if (!value) {
    return null;
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
}

function serializeUser(user) {
  if (!user) {
    return null;
  }

  const username =
    user.username || "";

  return {
    id: normalizeId(user),

    username,

    displayName:
      user.displayName ||
      username,

    avatarUrl:
      user.avatarUrl || "",
  };
}

function getParticipant(
  conversation,
  userId
) {
  const normalizedUserId =
    normalizeId(userId);

  return (
    conversation.participants.find(
      (participant) => {
        return (
          normalizeId(
            participant.userId
          ) === normalizedUserId
        );
      }
    ) || null
  );
}

function getOtherParticipant(
  conversation,
  currentUserId
) {
  const normalizedCurrentUserId =
    normalizeId(currentUserId);

  return (
    conversation.participants.find(
      (participant) => {
        return (
          normalizeId(
            participant.userId
          ) !==
          normalizedCurrentUserId
        );
      }
    ) || null
  );
}

function serializeLastMessage(
  conversation
) {
  const message =
    conversation.lastMessageId;

  if (
    !message ||
    !message._id
  ) {
    return null;
  }

  return {
    id:
      normalizeId(message),

    text:
      message.isDeleted
        ? "This message was deleted."
        : message.text || "",

    sender:
      serializeUser(
        message.senderId
      ),

    senderId:
      normalizeId(
        message.senderId
      ),

    isEdited:
      Boolean(
        message.isEdited
      ),

    isDeleted:
      Boolean(
        message.isDeleted
      ),

    createdAt:
      message.createdAt || null,
  };
}

function serializeConversation(
  conversation,
  currentUserId
) {
  const currentParticipant =
    getParticipant(
      conversation,
      currentUserId
    );

  const otherParticipant =
    getOtherParticipant(
      conversation,
      currentUserId
    );

  const conversationId =
    normalizeId(conversation);

  return {
    id:
      conversationId,

    _id:
      conversationId,

    participantKey:
      conversation.participantKey,

    otherUser:
      serializeUser(
        otherParticipant?.userId
      ),

    participants:
      conversation.participants.map(
        (participant) => {
          return {
            user:
              serializeUser(
                participant.userId
              ),

            userId:
              normalizeId(
                participant.userId
              ),

            joinedAt:
              participant.joinedAt,

            lastReadMessageId:
              normalizeId(
                participant
                  .lastReadMessageId
              ),

            lastReadAt:
              participant.lastReadAt ||
              null,

            unreadCount:
              Number(
                participant.unreadCount ||
                0
              ),
          };
        }
      ),

    unreadCount:
      Number(
        currentParticipant
          ?.unreadCount || 0
      ),

    lastReadMessageId:
      normalizeId(
        currentParticipant
          ?.lastReadMessageId
      ),

    lastReadAt:
      currentParticipant
        ?.lastReadAt || null,

    lastMessage:
      serializeLastMessage(
        conversation
      ),

    lastMessageId:
      normalizeId(
        conversation.lastMessageId
      ),

    lastMessageAt:
      conversation.lastMessageAt ||
      null,

    lastMessageSenderId:
      normalizeId(
        conversation
          .lastMessageSenderId
      ),

    lastMessagePreview:
      conversation
        .lastMessagePreview || "",

    createdAt:
      conversation.createdAt,

    updatedAt:
      conversation.updatedAt,
  };
}

function serializeDirectMessage(
  message
) {
  const messageId =
    normalizeId(message);

  return {
    id:
      messageId,

    _id:
      messageId,

    conversationId:
      normalizeId(
        message.conversationId
      ),

    sender:
      serializeUser(
        message.senderId
      ),

    senderId:
      normalizeId(
        message.senderId
      ),

    text:
      message.isDeleted
        ? "This message was deleted."
        : message.text || "",

    isEdited:
      !message.isDeleted &&
      Boolean(
        message.isEdited
      ),

    editedAt:
      message.isDeleted
        ? null
        : message.editedAt ||
          null,

    isDeleted:
      Boolean(
        message.isDeleted
      ),

    deletedAt:
      message.deletedAt ||
      null,

    createdAt:
      message.createdAt,

    updatedAt:
      message.updatedAt,
  };
}

module.exports = {
  getOtherParticipant,
  getParticipant,
  normalizeId,
  serializeConversation,
  serializeDirectMessage,
  serializeUser,
};