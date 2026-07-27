const User = require(
  "../models/User"
);

const {
  createOrGetConversation,
  getConversationMessages,
  getSerializedConversation,
  listConversations,
  markConversationRead,
} = require(
  "../services/directMessageService"
);

const {
  serializeUser,
} = require(
  "../services/directMessageSerializer"
);

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function sendError(
  response,
  error,
  fallbackMessage
) {
  if (error.status) {
    response
      .status(error.status)
      .json({
        error:
          error.message,

        code:
          error.code ||
          "DIRECT_MESSAGE_ERROR",
      });

    return;
  }

  console.error(
    fallbackMessage,
    error
  );

  response
    .status(500)
    .json({
      error:
        fallbackMessage,

      code:
        "INTERNAL_ERROR",
    });
}

async function searchUsers(
  request,
  response
) {
  try {
    const currentUserId =
      request.session.userId;

    const query =
      String(
        request.query.q ||
        ""
      )
        .trim()
        .slice(0, 50);

    if (query.length < 2) {
      response.json({
        users: [],

        minimumQueryLength:
          2,
      });

      return;
    }

    const safeQuery =
      escapeRegex(query);

    const searchPattern =
      new RegExp(
        safeQuery,
        "i"
      );

    const users =
      await User.find({
        _id: {
          $ne:
            currentUserId,
        },

        $or: [
          {
            username:
              searchPattern,
          },

          {
            displayName:
              searchPattern,
          },
        ],
      })
        .select(
          "username displayName avatarUrl"
        )
        .sort({
          username: 1,
        })
        .limit(20)
        .lean();

    response.json({
      users:
        users.map(
          serializeUser
        ),
    });
  } catch (error) {
    sendError(
      response,
      error,
      "Unable to search users."
    );
  }
}

async function getConversations(
  request,
  response
) {
  try {
    const conversations =
      await listConversations(
        request.session.userId
      );

    const totalUnread =
      conversations.reduce(
        (
          total,
          conversation
        ) => {
          return (
            total +
            Number(
              conversation
                .unreadCount ||
              0
            )
          );
        },
        0
      );

    response.json({
      conversations,

      totalUnread,
    });
  } catch (error) {
    sendError(
      response,
      error,
      "Unable to load direct conversations."
    );
  }
}

async function openConversation(
  request,
  response
) {
  try {
    const result =
      await createOrGetConversation(
        request.session.userId,
        request.params.userId
      );

    response
      .status(
        result.created
          ? 201
          : 200
      )
      .json(result);
  } catch (error) {
    sendError(
      response,
      error,
      "Unable to open the direct conversation."
    );
  }
}

async function getConversation(
  request,
  response
) {
  try {
    const conversation =
      await getSerializedConversation(
        request.params
          .conversationId,

        request.session.userId
      );

    response.json({
      conversation,
    });
  } catch (error) {
    sendError(
      response,
      error,
      "Unable to load the direct conversation."
    );
  }
}

async function getMessages(
  request,
  response
) {
  try {
    const result =
      await getConversationMessages({
        conversationId:
          request.params
            .conversationId,

        userId:
          request.session.userId,

        cursor:
          request.query.cursor,

        limit:
          request.query.limit,
      });

    response.json(result);
  } catch (error) {
    sendError(
      response,
      error,
      "Unable to load direct messages."
    );
  }
}

async function markRead(
  request,
  response
) {
  try {
    const result =
      await markConversationRead(
        request.params
          .conversationId,

        request.session.userId
      );

    response.json(result);
  } catch (error) {
    sendError(
      response,
      error,
      "Unable to mark the conversation as read."
    );
  }
}

module.exports = {
  getConversation,
  getConversations,
  getMessages,
  markRead,
  openConversation,
  searchUsers,
};