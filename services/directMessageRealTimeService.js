const DirectConversation = require(
  "../models/DirectConversation"
);

const DirectMessage = require(
  "../models/DirectMessage"
);

const {
  getConversationForUser,
  markConversationRead,
  populateConversation,
} = require(
  "./directMessageService"
);

const {
  normalizeId,
  serializeConversation,
  serializeDirectMessage,
} = require(
  "./directMessageSerializer"
);

const USER_FIELDS =
  "username displayName avatarUrl";

function cleanMessageText(value) {
  const text =
    String(value || "")
      .trim();

  if (!text) {
    const error =
      new Error(
        "Enter a message."
      );

    error.status = 400;
    error.code =
      "EMPTY_DIRECT_MESSAGE";

    throw error;
  }

  if (text.length > 4000) {
    const error =
      new Error(
        "Direct messages cannot exceed 4000 characters."
      );

    error.status = 400;
    error.code =
      "DIRECT_MESSAGE_TOO_LONG";

    throw error;
  }

  return text;
}

function createMessagePreview(text) {
  if (text.length <= 160) {
    return text;
  }

  return `${text.slice(
    0,
    157
  )}...`;
}

function getParticipantIds(
  conversation
) {
  return conversation.participants
    .map((participant) => {
      return normalizeId(
        participant.userId
      );
    })
    .filter(Boolean);
}

function getRecipientUserId(
  conversation,
  senderId
) {
  const normalizedSenderId =
    normalizeId(senderId);

  return (
    getParticipantIds(
      conversation
    ).find((participantId) => {
      return (
        participantId !==
        normalizedSenderId
      );
    }) || null
  );
}

async function getPopulatedConversation(
  conversationId
) {
  const conversation =
    await DirectConversation.findById(
      conversationId
    );

  if (!conversation) {
    const error =
      new Error(
        "The direct conversation was not found."
      );

    error.status = 404;
    error.code =
      "CONVERSATION_NOT_FOUND";

    throw error;
  }

  await populateConversation(
    conversation
  );

  return conversation;
}

function createConversationSnapshots(
  conversation
) {
  return getParticipantIds(
    conversation
  ).map((userId) => {
    return {
      userId,

      conversation:
        serializeConversation(
          conversation,
          userId
        ),
    };
  });
}

async function createDirectMessage({
  conversationId,
  senderId,
  text,
}) {
  const cleanText =
    cleanMessageText(text);

  const conversation =
    await getConversationForUser(
      conversationId,
      senderId
    );

  const recipientUserId =
    getRecipientUserId(
      conversation,
      senderId
    );

  if (!recipientUserId) {
    const error =
      new Error(
        "The conversation recipient could not be found."
      );

    error.status = 400;
    error.code =
      "RECIPIENT_NOT_FOUND";

    throw error;
  }

  const message =
    await DirectMessage.create({
      conversationId:
        conversation._id,

      senderId,

      text:
        cleanText,
  });

  await DirectConversation.updateOne(
    {
      _id:
        conversation._id,
    },
    {
      $set: {
        lastMessageId:
          message._id,

        lastMessageAt:
          message.createdAt,

        lastMessageSenderId:
          senderId,

        lastMessagePreview:
          createMessagePreview(
            cleanText
          ),

        "participants.$[sender].lastReadMessageId":
          message._id,

        "participants.$[sender].lastReadAt":
          message.createdAt,

        "participants.$[sender].unreadCount":
          0,
      },

      $inc: {
        "participants.$[recipient].unreadCount":
          1,
      },
    },
    {
      arrayFilters: [
        {
          "sender.userId":
            senderId,
        },

        {
          "recipient.userId":
            recipientUserId,
        },
      ],
    }
  );

  await message.populate({
    path:
      "senderId",

    select:
      USER_FIELDS,
  });

  const updatedConversation =
    await getPopulatedConversation(
      conversation._id
    );

  return {
    message:
      serializeDirectMessage(
        message
      ),

    conversation:
      updatedConversation,

    senderId:
      normalizeId(senderId),

    recipientUserId,
  };
}

async function markDirectConversationRead({
  conversationId,
  userId,
}) {
  const readState =
    await markConversationRead(
      conversationId,
      userId
    );

  const conversation =
    await getPopulatedConversation(
      conversationId
    );

  return {
    readState: {
      ...readState,

      userId:
        normalizeId(userId),
    },

    conversation,
  };
}

module.exports = {
  createConversationSnapshots,
  createDirectMessage,
  getParticipantIds,
  getPopulatedConversation,
  getRecipientUserId,
  markDirectConversationRead,
};