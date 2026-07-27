const mongoose = require("mongoose");

const DirectConversation = require(
  "../models/DirectConversation"
);

const DirectMessage = require(
  "../models/DirectMessage"
);

const User = require(
  "../models/User"
);

const {
  serializeConversation,
  serializeDirectMessage,
} = require(
  "./directMessageSerializer"
);

const USER_FIELDS =
  "username displayName avatarUrl";

const CONVERSATION_POPULATION = [
  {
    path:
      "participants.userId",

    select:
      USER_FIELDS,
  },

  {
    path:
      "lastMessageId",

    select:
      "text senderId isEdited isDeleted createdAt",

    populate: {
      path:
        "senderId",

      select:
        USER_FIELDS,
    },
  },
];

const MESSAGE_POPULATION = [
  {
    path:
      "senderId",

    select:
      USER_FIELDS,
  },
];

function createServiceError(
  status,
  message,
  code
) {
  const error =
    new Error(message);

  error.status = status;
  error.code = code;

  return error;
}

function normalizeId(value) {
  return String(
    value?._id ||
    value ||
    ""
  ).trim();
}

function buildParticipantKey(
  firstUserId,
  secondUserId
) {
  return [
    normalizeId(firstUserId),
    normalizeId(secondUserId),
  ]
    .sort()
    .join(":");
}

function validateObjectId(
  value,
  fieldName
) {
  if (
    !mongoose.isValidObjectId(
      value
    )
  ) {
    throw createServiceError(
      400,
      `${fieldName} is invalid.`,
      "INVALID_OBJECT_ID"
    );
  }
}

async function populateConversation(
  conversation
) {
  await conversation.populate(
    CONVERSATION_POPULATION
  );

  return conversation;
}

async function createOrGetConversation(
  currentUserId,
  targetUserId
) {
  validateObjectId(
    currentUserId,
    "Current user"
  );

  validateObjectId(
    targetUserId,
    "Selected user"
  );

  if (
    normalizeId(currentUserId) ===
    normalizeId(targetUserId)
  ) {
    throw createServiceError(
      400,
      "You cannot start a direct conversation with yourself.",
      "SELF_CONVERSATION"
    );
  }

  const targetUser =
    await User.findById(
      targetUserId
    ).select("_id");

  if (!targetUser) {
    throw createServiceError(
      404,
      "The selected user was not found.",
      "USER_NOT_FOUND"
    );
  }

  const participantKey =
    buildParticipantKey(
      currentUserId,
      targetUserId
    );

  let conversation =
    await DirectConversation.findOne({
      participantKey,
      isArchived: false,
    });

  let created = false;

  if (!conversation) {
    try {
      conversation =
        await DirectConversation.create({
          participantKey,

          participants: [
            {
              userId:
                currentUserId,

              joinedAt:
                new Date(),

              unreadCount:
                0,
            },

            {
              userId:
                targetUserId,

              joinedAt:
                new Date(),

              unreadCount:
                0,
            },
          ],

          createdBy:
            currentUserId,
        });

      created = true;
    } catch (error) {
      if (
        error?.code !== 11000
      ) {
        throw error;
      }

      conversation =
        await DirectConversation.findOne({
          participantKey,
          isArchived: false,
        });

      if (!conversation) {
        throw error;
      }
    }
  }

  await populateConversation(
    conversation
  );

  return {
    created,

    conversation:
      serializeConversation(
        conversation,
        currentUserId
      ),
  };
}

async function getConversationForUser(
  conversationId,
  userId
) {
  validateObjectId(
    conversationId,
    "Conversation"
  );

  const conversation =
    await DirectConversation.findOne({
      _id:
        conversationId,

      isArchived:
        false,

      "participants.userId":
        userId,
    });

  if (!conversation) {
    throw createServiceError(
      404,
      "The conversation was not found or you do not have access to it.",
      "CONVERSATION_NOT_FOUND"
    );
  }

  return conversation;
}

async function getSerializedConversation(
  conversationId,
  userId
) {
  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  await populateConversation(
    conversation
  );

  return serializeConversation(
    conversation,
    userId
  );
}

async function listConversations(
  userId
) {
  const conversations =
    await DirectConversation.find({
      isArchived:
        false,

      "participants.userId":
        userId,
    })
      .sort({
        lastMessageAt:
          -1,

        updatedAt:
          -1,
      })
      .populate(
        CONVERSATION_POPULATION
      );

  return conversations.map(
    (conversation) => {
      return serializeConversation(
        conversation,
        userId
      );
    }
  );
}

function getPaginationLimit(value) {
  const parsedLimit =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(
      parsedLimit
    )
  ) {
    return 50;
  }

  return Math.min(
    Math.max(
      parsedLimit,
      1
    ),
    100
  );
}

async function getConversationMessages({
  conversationId,
  userId,
  cursor,
  limit,
}) {
  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  const pageLimit =
    getPaginationLimit(limit);

  const filter = {
    conversationId:
      conversation._id,
  };

  if (cursor) {
    validateObjectId(
      cursor,
      "Message cursor"
    );

    filter._id = {
      $lt:
        cursor,
    };
  }

  const messages =
    await DirectMessage.find(
      filter
    )
      .sort({
        _id: -1,
      })
      .limit(
        pageLimit + 1
      )
      .populate(
        MESSAGE_POPULATION
      );

  const hasMore =
    messages.length >
    pageLimit;

  const page =
    hasMore
      ? messages.slice(
          0,
          pageLimit
        )
      : messages;

  const nextCursor =
    hasMore &&
    page.length
      ? String(
          page[
            page.length - 1
          ]._id
        )
      : null;

  const serializedMessages =
    page
      .map(
        serializeDirectMessage
      )
      .reverse();

  return {
    messages:
      serializedMessages,

    pageInfo: {
      limit:
        pageLimit,

      hasMore,

      nextCursor,
    },
  };
}

async function markConversationRead(
  conversationId,
  userId
) {
  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  const latestMessage =
    await DirectMessage.findOne({
      conversationId:
        conversation._id,
    })
      .sort({
        _id: -1,
      })
      .select(
        "_id createdAt"
      )
      .lean();

  const lastReadMessageId =
    latestMessage?._id ||
    null;

  const lastReadAt =
    latestMessage?.createdAt ||
    new Date();

  await DirectConversation.updateOne(
    {
      _id:
        conversation._id,

      "participants.userId":
        userId,
    },
    {
      $set: {
        "participants.$.lastReadMessageId":
          lastReadMessageId,

        "participants.$.lastReadAt":
          lastReadAt,

        "participants.$.unreadCount":
          0,
      },
    }
  );

  return {
    conversationId:
      String(
        conversation._id
      ),

    unreadCount:
      0,

    lastReadMessageId:
      lastReadMessageId
        ? String(
            lastReadMessageId
          )
        : null,

    lastReadAt,
  };
}

module.exports = {
  CONVERSATION_POPULATION,
  MESSAGE_POPULATION,
  buildParticipantKey,
  createOrGetConversation,
  createServiceError,
  getConversationForUser,
  getConversationMessages,
  getSerializedConversation,
  listConversations,
  markConversationRead,
  populateConversation,
};