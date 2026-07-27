import {
  dom,
} from "./dom.js";

import {
  state,
  getCurrentUserId,
  normalizeId,
} from "./state.js";

import {
  fetchConversation,
  fetchConversationMessages,
  fetchConversations,
  markConversationRead,
} from "./api.js";

import {
  joinDirectConversation,
  leaveDirectConversation,
  markDirectConversationRead,
  requestPresence,
} from "./socket.js";

import {
  applyPresenceSnapshot,
  getConversationUserIds,
  isUserOnline,
  setPresence,
} from "./presence.js";

import {
  appendMessage,
  clearMessages,
  prependMessages,
  scrollMessagesToBottom,
  setMessages,
} from "./messages.js";

let readTimer = null;

function getInitials(user) {
  const source =
    user?.displayName ||
    user?.username ||
    "?";

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      return part[0];
    })
    .join("")
    .toUpperCase();
}

function createAvatar(
  user,
  className
) {
  const avatar =
    document.createElement("div");

  avatar.className =
    className;

  if (user?.avatarUrl) {
    const image =
      document.createElement("img");

    image.src =
      user.avatarUrl;

    image.alt =
      user.displayName ||
      user.username ||
      "User";

    image.addEventListener(
      "error",
      () => {
        image.remove();

        avatar.textContent =
          getInitials(user);
      },
      {
        once: true,
      }
    );

    avatar.appendChild(image);
  } else {
    avatar.textContent =
      getInitials(user);
  }

  return avatar;
}

function formatConversationTime(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const today =
    new Date();

  const isToday =
    date.toDateString() ===
    today.toDateString();

  return new Intl.DateTimeFormat(
    undefined,
    isToday
      ? {
          hour: "numeric",
          minute: "2-digit",
        }
      : {
          month: "short",
          day: "numeric",
        }
  ).format(date);
}

function sortConversations() {
  state.conversations.sort(
    (
      firstConversation,
      secondConversation
    ) => {
      const firstTime =
        new Date(
          firstConversation
            .lastMessageAt ||
          firstConversation
            .updatedAt ||
          firstConversation
            .createdAt ||
          0
        ).getTime();

      const secondTime =
        new Date(
          secondConversation
            .lastMessageAt ||
          secondConversation
            .updatedAt ||
          secondConversation
            .createdAt ||
          0
        ).getTime();

      return (
        secondTime -
        firstTime
      );
    }
  );
}

function findConversation(
  conversationId
) {
  const normalizedConversationId =
    normalizeId(
      conversationId
    );

  return (
    state.conversations.find(
      (conversation) => {
        return (
          normalizeId(
            conversation
          ) ===
          normalizedConversationId
        );
      }
    ) || null
  );
}

function createConversationCard(
  conversation
) {
  const conversationId =
    normalizeId(
      conversation
    );

  const otherUser =
    conversation.otherUser ||
    {};

  const button =
    document.createElement("button");

  button.type = "button";

  button.className =
    "dm-conversation-card";

  button.dataset.conversationId =
    conversationId;

  if (
    conversationId ===
    state.activeConversationId
  ) {
    button.classList.add(
      "dm-conversation-active"
    );
  }

  const avatarWrapper =
    document.createElement("div");

  avatarWrapper.className =
    "dm-conversation-avatar-wrap";

  avatarWrapper.appendChild(
    createAvatar(
      otherUser,
      "dm-conversation-avatar"
    )
  );

  const presenceDot =
    document.createElement("span");

  presenceDot.className =
    "dm-presence-dot";

  presenceDot.classList.toggle(
    "is-online",
    isUserOnline(
      otherUser.id
    )
  );

  avatarWrapper.appendChild(
    presenceDot
  );

  const content =
    document.createElement("div");

  content.className =
    "dm-conversation-content";

  const heading =
    document.createElement("div");

  heading.className =
    "dm-conversation-heading";

  const name =
    document.createElement("strong");

  name.textContent =
    otherUser.displayName ||
    otherUser.username ||
    "User";

  const time =
    document.createElement("time");

  time.textContent =
    formatConversationTime(
      conversation.lastMessageAt
    );

  heading.append(
    name,
    time
  );

  const summary =
    document.createElement("div");

  summary.className =
    "dm-conversation-summary";

  const preview =
    document.createElement("span");

  let previewText =
    conversation.lastMessage
      ?.text ||
    conversation.lastMessagePreview ||
    "Start a conversation";

  if (
    conversation.lastMessageAt &&
    normalizeId(
      conversation
        .lastMessageSenderId
    ) ===
      getCurrentUserId()
  ) {
    previewText =
      `You: ${previewText}`;
  }

  preview.textContent =
    previewText;

  summary.appendChild(
    preview
  );

  const unreadCount =
    Number(
      conversation.unreadCount ||
      0
    );

  if (unreadCount > 0) {
    const unread =
      document.createElement("strong");

    unread.className =
      "dm-unread-badge";

    unread.textContent =
      unreadCount > 99
        ? "99+"
        : String(unreadCount);

    summary.appendChild(
      unread
    );
  }

  content.append(
    heading,
    summary
  );

  button.append(
    avatarWrapper,
    content
  );

  return button;
}

export function renderConversations() {
  sortConversations();

  dom.conversationList.replaceChildren();

  state.conversations.forEach(
    (conversation) => {
      dom.conversationList.appendChild(
        createConversationCard(
          conversation
        )
      );
    }
  );

  const isEmpty =
    state.conversations.length === 0;

  dom.conversationEmpty.hidden =
    !isEmpty;

  dom.conversationList.hidden =
    isEmpty;
}

export function upsertConversation(
  conversation
) {
  const conversationId =
    normalizeId(
      conversation
    );

  if (!conversationId) {
    return;
  }

  const existingIndex =
    state.conversations.findIndex(
      (existingConversation) => {
        return (
          normalizeId(
            existingConversation
          ) ===
          conversationId
        );
      }
    );

  if (existingIndex === -1) {
    state.conversations.push(
      conversation
    );
  } else {
    state.conversations[
      existingIndex
    ] = {
      ...state.conversations[
        existingIndex
      ],

      ...conversation,
    };
  }

  if (
    state.activeConversationId ===
    conversationId
  ) {
    state.activeConversation =
      findConversation(
        conversationId
      );
  }

  renderConversations();
}

function updateActiveHeader() {
  const conversation =
    state.activeConversation;

  if (!conversation) {
    dom.activeAvatar.replaceChildren();

    dom.activeName.textContent =
      "Conversation";

    dom.activeUsername.textContent =
      "";

    dom.activePresence.textContent =
      "Connecting...";

    dom.activePresence.classList.remove(
      "is-online"
    );

    return;
  }

  const otherUser =
    conversation.otherUser ||
    {};

  dom.activeAvatar.replaceChildren();

  dom.activeAvatar.appendChild(
    createAvatar(
      otherUser,
      "dm-active-avatar-content"
    )
  );

  dom.activeName.textContent =
    otherUser.displayName ||
    otherUser.username ||
    "User";

  dom.activeUsername.textContent =
    otherUser.username
      ? `@${otherUser.username}`
      : "";

  const online =
    isUserOnline(
      otherUser.id
    );

  dom.activePresence.textContent =
    online
      ? "Online"
      : "Offline";

  dom.activePresence.classList.toggle(
    "is-online",
    online
  );
}

function showActiveConversation() {
  /*
   * Remove the attributes explicitly so the
   * panel cannot remain hidden because of
   * stale DOM state.
   */
  dom.chatEmpty.hidden =
    true;

  dom.chatEmpty.setAttribute(
    "hidden",
    ""
  );

  dom.chatActive.hidden =
    false;

  dom.chatActive.removeAttribute(
    "hidden"
  );

  dom.shell.classList.add(
    "dm-chat-open"
  );

  dom.messageInput.disabled =
    false;

  dom.sendButton.disabled =
    false;

  updateActiveHeader();
}

function showConversationList() {
  dom.shell.classList.remove(
    "dm-chat-open"
  );
}

function updateLoadOlderButton() {
  dom.loadOlderButton.hidden =
    !state.hasMoreMessages;

  dom.loadOlderButton.disabled =
    state.loadingMessages;

  dom.loadOlderButton.textContent =
    state.loadingMessages
      ? "Loading..."
      : "Load older messages";
}

function updateConversationUnread(
  conversationId,
  unreadCount
) {
  const conversation =
    findConversation(
      conversationId
    );

  if (!conversation) {
    return;
  }

  conversation.unreadCount =
    Number(
      unreadCount ||
      0
    );

  renderConversations();
}

function updateUrl(
  conversationId
) {
  const url =
    new URL(
      window.location.href
    );

  url.searchParams.set(
    "conversation",
    conversationId
  );

  window.history.replaceState(
    {},
    "",
    url
  );
}

export function setPageStatus(
  message = "",
  type = ""
) {
  dom.pageStatus.textContent =
    message;

  dom.pageStatus.dataset.type =
    type;
}

export async function loadConversations() {
  const result =
    await fetchConversations();

  state.conversations =
    Array.isArray(
      result.conversations
    )
      ? result.conversations
      : [];

  renderConversations();

  return state.conversations;
}

async function loadConversationDetails(
  conversationId
) {
  const existingConversation =
    findConversation(
      conversationId
    );

  if (existingConversation) {
    return existingConversation;
  }

  const result =
    await fetchConversation(
      conversationId
    );

  const conversation =
    result.conversation;

  if (!conversation) {
    throw new Error(
      "The conversation could not be loaded."
    );
  }

  upsertConversation(
    conversation
  );

  return conversation;
}

async function joinConversationRealtime(
  conversationId,
  activationToken
) {
  try {
    const result =
      await joinDirectConversation(
        conversationId
      );

    if (
      activationToken !==
      state.activationToken
    ) {
      return;
    }

    if (result.presence) {
      setPresence(
        result.presence.userId,
        result.presence.isOnline
      );

      renderConversations();
      updateActiveHeader();
    }
  } catch (error) {
    /*
     * Socket failure must not hide the chat
     * interface or disable the textarea.
     */
    console.error(
      "Unable to join real-time conversation:",
      error
    );

    setPageStatus(
      "Real-time messaging is reconnecting.",
      "warning"
    );
  }
}

export async function activateConversation(
  conversationId,
  {
    updateUrl:
      shouldUpdateUrl = true,
  } = {}
) {
  const normalizedConversationId =
    normalizeId(
      conversationId
    );

  if (!normalizedConversationId) {
    setPageStatus(
      "The conversation ID is missing.",
      "error"
    );

    return;
  }

  const activationToken =
    ++state.activationToken;

  const previousConversationId =
    state.activeConversationId;

  /*
   * Activate the visual chat panel first.
   * Network requests happen afterwards.
   */
  state.activeConversationId =
    normalizedConversationId;

  state.activeConversation =
    findConversation(
      normalizedConversationId
    );

  clearMessages();

  state.nextCursor = null;
  state.hasMoreMessages = false;
  state.loadingMessages = false;

  updateLoadOlderButton();
  showActiveConversation();
  renderConversations();
  setPageStatus("");

  if (shouldUpdateUrl) {
    updateUrl(
      normalizedConversationId
    );
  }

  if (
    previousConversationId &&
    previousConversationId !==
      normalizedConversationId
  ) {
    leaveDirectConversation(
      previousConversationId
    ).catch(() => {});
  }

  try {
    const conversation =
      await loadConversationDetails(
        normalizedConversationId
      );

    if (
      activationToken !==
      state.activationToken
    ) {
      return;
    }

    state.activeConversation =
      conversation;

    showActiveConversation();
    renderConversations();

    /*
     * Do not await this before loading history.
     */
    joinConversationRealtime(
      normalizedConversationId,
      activationToken
    );

    const result =
      await fetchConversationMessages({
        conversationId:
          normalizedConversationId,

        limit:
          50,
      });

    if (
      activationToken !==
      state.activationToken
    ) {
      return;
    }

    setMessages(
      result.messages ||
      []
    );

    state.nextCursor =
      result.pageInfo
        ?.nextCursor ||
      null;

    state.hasMoreMessages =
      Boolean(
        result.pageInfo
          ?.hasMore
      );

    updateLoadOlderButton();

    window.requestAnimationFrame(
      () => {
        scrollMessagesToBottom();

        dom.messageInput.focus();
      }
    );

    scheduleMarkActiveRead();
  } catch (error) {
    console.error(
      "Activate direct conversation error:",
      error
    );

    /*
     * Keep the composer visible while displaying
     * the actual loading error.
     */
    showActiveConversation();

    setPageStatus(
      error.message ||
      "Unable to load the conversation.",
      "error"
    );
  }
}

export async function loadOlderMessages() {
  if (
    !state.activeConversationId ||
    !state.hasMoreMessages ||
    state.loadingMessages
  ) {
    return;
  }

  state.loadingMessages =
    true;

  updateLoadOlderButton();

  try {
    const result =
      await fetchConversationMessages({
        conversationId:
          state.activeConversationId,

        cursor:
          state.nextCursor,

        limit:
          50,
      });

    prependMessages(
      result.messages ||
      []
    );

    state.nextCursor =
      result.pageInfo
        ?.nextCursor ||
      null;

    state.hasMoreMessages =
      Boolean(
        result.pageInfo
          ?.hasMore
      );
  } catch (error) {
    setPageStatus(
      error.message,
      "error"
    );
  } finally {
    state.loadingMessages =
      false;

    updateLoadOlderButton();
  }
}

export async function markActiveConversationRead() {
  if (
    !state.activeConversationId ||
    document.hidden ||
    !document.hasFocus()
  ) {
    return;
  }

  const conversationId =
    state.activeConversationId;

  updateConversationUnread(
    conversationId,
    0
  );

  try {
    await markDirectConversationRead(
      conversationId
    );
  } catch (socketError) {
    try {
      await markConversationRead(
        conversationId
      );
    } catch (apiError) {
      console.error(
        "Unable to mark direct conversation as read:",
        apiError
      );
    }
  }
}

export function scheduleMarkActiveRead() {
  window.clearTimeout(
    readTimer
  );

  readTimer =
    window.setTimeout(
      markActiveConversationRead,
      450
    );
}

export function handleDirectMessage(
  message
) {
  const conversationId =
    normalizeId(
      message.conversationId
    );

  if (
    conversationId !==
    state.activeConversationId
  ) {
    return;
  }

  appendMessage(
    message,
    {
      scroll: true,
    }
  );

  scheduleMarkActiveRead();
}

export function handleConversationActivity(
  payload
) {
  const conversation =
    payload?.conversation;

  if (!conversation) {
    return;
  }

  upsertConversation(
    conversation
  );

  if (
    normalizeId(
      conversation
    ) ===
    state.activeConversationId
  ) {
    state.activeConversation =
      findConversation(
        state.activeConversationId
      );

    updateActiveHeader();

    if (
      !document.hidden &&
      document.hasFocus()
    ) {
      scheduleMarkActiveRead();
    }
  }
}

export function handleMessageRead(
  payload
) {
  if (
    normalizeId(
      payload?.userId
    ) !==
    getCurrentUserId()
  ) {
    return;
  }

  updateConversationUnread(
    payload.conversationId,
    0
  );
}

export function handleTypingStart(
  payload
) {
  if (
    normalizeId(
      payload?.conversationId
    ) !==
    state.activeConversationId
  ) {
    return;
  }

  if (
    normalizeId(
      payload?.userId
    ) ===
    getCurrentUserId()
  ) {
    return;
  }

  state.typingConversationId =
    state.activeConversationId;

  dom.typingIndicator.hidden =
    false;

  scrollMessagesToBottom();
}

export function handleTypingStop(
  payload
) {
  if (
    normalizeId(
      payload?.conversationId
    ) !==
    state.activeConversationId
  ) {
    return;
  }

  state.typingConversationId =
    null;

  dom.typingIndicator.hidden =
    true;
}

export function handlePresenceUpdated(
  payload
) {
  setPresence(
    payload?.userId,
    payload?.isOnline
  );

  renderConversations();
  updateActiveHeader();
}

export async function refreshPresence() {
  const userIds =
    getConversationUserIds();

  if (!userIds.length) {
    return;
  }

  try {
    const result =
      await requestPresence(
        userIds
      );

    applyPresenceSnapshot(
      result.presence ||
      []
    );

    renderConversations();
    updateActiveHeader();
  } catch (error) {
    console.error(
      "Unable to refresh direct-message presence:",
      error
    );
  }
}

export function handleSocketConnected() {
  setPageStatus("");

  if (
    state.activeConversationId
  ) {
    joinDirectConversation(
      state.activeConversationId
    ).catch(() => {});
  }

  refreshPresence();
}

export function handleSocketDisconnected() {
  setPageStatus(
    "Reconnecting to real-time messaging...",
    "warning"
  );
}

export function handleSocketError(
  error
) {
  setPageStatus(
    error?.message ||
    "Unable to connect to real-time messaging.",
    "error"
  );
}

export function bindConversationEvents() {
  dom.conversationList.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "button[data-conversation-id]"
        );

      if (
        !button ||
        !dom.conversationList.contains(
          button
        )
      ) {
        return;
      }

      event.preventDefault();

      activateConversation(
        button.dataset
          .conversationId
      );
    }
  );

  dom.loadOlderButton.addEventListener(
    "click",
    loadOlderMessages
  );

  dom.mobileBackButton.addEventListener(
    "click",
    showConversationList
  );

  window.addEventListener(
    "focus",
    scheduleMarkActiveRead
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        scheduleMarkActiveRead();
      }
    }
  );
}