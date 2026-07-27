const unreadByConversation =
  new Map();

let directMessageSocket = null;

function normalizeId(value) {
  return String(
    value?._id ||
    value?.id ||
    value ||
    ""
  ).trim();
}

function getUnreadBadge() {
  return document.getElementById(
    "messages-unread-badge"
  );
}

function calculateTotalUnread() {
  let totalUnread = 0;

  unreadByConversation.forEach(
    (unreadCount) => {
      totalUnread += Number(
        unreadCount || 0
      );
    }
  );

  return totalUnread;
}

function renderUnreadBadge() {
  const badge =
    getUnreadBadge();

  if (!badge) {
    return;
  }

  const totalUnread =
    calculateTotalUnread();

  badge.hidden =
    totalUnread < 1;

  badge.textContent =
    totalUnread > 99
      ? "99+"
      : String(totalUnread);

  badge.setAttribute(
    "aria-label",
    `${totalUnread} unread direct message${
      totalUnread === 1
        ? ""
        : "s"
    }`
  );
}

function updateConversationUnread(
  conversation
) {
  const conversationId =
    normalizeId(conversation);

  if (!conversationId) {
    return;
  }

  unreadByConversation.set(
    conversationId,
    Number(
      conversation.unreadCount ||
      0
    )
  );

  renderUnreadBadge();
}

function applyConversationList(
  conversations
) {
  unreadByConversation.clear();

  (
    Array.isArray(conversations)
      ? conversations
      : []
  ).forEach(
    updateConversationUnread
  );

  renderUnreadBadge();
}

async function loadDirectMessageUnread() {
  try {
    const response =
      await fetch(
        "/api/direct-messages/conversations",
        {
          credentials:
            "same-origin",

          headers: {
            Accept:
              "application/json",
          },
        }
      );

    if (!response.ok) {
      return;
    }

    const result =
      await response.json();

    applyConversationList(
      result.conversations
    );
  } catch (error) {
    console.error(
      "Unable to load direct-message unread count:",
      error
    );
  }
}

function bindDirectMessageUpdates() {
  if (
    typeof window.io !==
    "function"
  ) {
    return;
  }

  directMessageSocket =
    window.io();

  directMessageSocket.on(
    "connect",
    () => {
      loadDirectMessageUnread();
    }
  );

  directMessageSocket.on(
    "directConversationActivity",
    (payload) => {
      const conversation =
        payload?.conversation;

      if (!conversation) {
        return;
      }

      updateConversationUnread(
        conversation
      );
    }
  );

  directMessageSocket.on(
    "directMessageRead",
    (payload) => {
      const conversationId =
        normalizeId(
          payload?.conversationId
        );

      if (!conversationId) {
        return;
      }

      /*
       * Conversation activity normally follows
       * this event. This immediate update keeps
       * the badge responsive between events.
       */
      unreadByConversation.set(
        conversationId,
        0
      );

      renderUnreadBadge();
    }
  );
}

export async function initializeDirectMessageBadge() {
  await loadDirectMessageUnread();

  bindDirectMessageUpdates();
}