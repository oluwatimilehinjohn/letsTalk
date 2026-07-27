import {
  dom,
} from "./dom.js";

import {
  state,
  getCurrentUserId,
  normalizeId,
} from "./state.js";

function getInitials(user) {
  const value =
    user?.displayName ||
    user?.username ||
    "?";

  return value
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

function formatMessageTime(
  value
) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function getDateKey(value) {
  const date =
    new Date(value);

  return [
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ].join("-");
}

function formatDateLabel(value) {
  const date =
    new Date(value);

  const today =
    new Date();

  const yesterday =
    new Date();

  yesterday.setDate(
    today.getDate() - 1
  );

  if (
    getDateKey(date) ===
    getDateKey(today)
  ) {
    return "Today";
  }

  if (
    getDateKey(date) ===
    getDateKey(yesterday)
  ) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() ===
        today.getFullYear()
          ? undefined
          : "numeric",
    }
  ).format(date);
}

function createDateDivider(
  value
) {
  const divider =
    document.createElement("div");

  divider.className =
    "dm-date-divider";

  const label =
    document.createElement("span");

  label.textContent =
    formatDateLabel(value);

  divider.appendChild(label);

  return divider;
}

function createMessageRow(
  message
) {
  const isOwnMessage =
    normalizeId(
      message.senderId
    ) ===
    getCurrentUserId();

  const row =
    document.createElement("article");

  row.className =
    `dm-message-row ${
      isOwnMessage
        ? "dm-message-own"
        : "dm-message-other"
    }`;

  row.dataset.messageId =
    normalizeId(message);

  if (!isOwnMessage) {
    row.appendChild(
      createAvatar(
        message.sender,
        "dm-message-avatar"
      )
    );
  }

  const bubble =
    document.createElement("div");

  bubble.className =
    "dm-message-bubble";

  if (!isOwnMessage) {
    const sender =
      document.createElement("strong");

    sender.className =
      "dm-message-sender";

    sender.textContent =
      message.sender
        ?.displayName ||
      message.sender
        ?.username ||
      "User";

    bubble.appendChild(sender);
  }

  const text =
    document.createElement("p");

  text.className =
    "dm-message-text";

  text.textContent =
    message.text || "";

  if (message.isDeleted) {
    row.classList.add(
      "dm-message-deleted"
    );
  }

  bubble.appendChild(text);

  const metadata =
    document.createElement("div");

  metadata.className =
    "dm-message-metadata";

  if (message.isEdited) {
    const edited =
      document.createElement("span");

    edited.textContent =
      "Edited";

    metadata.appendChild(edited);
  }

  const time =
    document.createElement("time");

  time.dateTime =
    message.createdAt || "";

  time.textContent =
    formatMessageTime(
      message.createdAt
    );

  metadata.appendChild(time);

  bubble.appendChild(metadata);
  row.appendChild(bubble);

  return row;
}

function sortMessages(
  messages
) {
  return [...messages].sort(
    (first, second) => {
      const firstTime =
        new Date(
          first.createdAt
        ).getTime();

      const secondTime =
        new Date(
          second.createdAt
        ).getTime();

      if (
        firstTime !==
        secondTime
      ) {
        return (
          firstTime -
          secondTime
        );
      }

      return normalizeId(
        first
      ).localeCompare(
        normalizeId(second)
      );
    }
  );
}

function rebuildMessageIds() {
  state.messageIds =
    new Set(
      state.messages.map(
        normalizeId
      )
    );
}

export function renderMessages() {
  dom.messageList.replaceChildren();

  let previousDateKey =
    null;

  state.messages.forEach(
    (message) => {
      const dateKey =
        getDateKey(
          message.createdAt
        );

      if (
        dateKey !==
        previousDateKey
      ) {
        dom.messageList.appendChild(
          createDateDivider(
            message.createdAt
          )
        );

        previousDateKey =
          dateKey;
      }

      dom.messageList.appendChild(
        createMessageRow(
          message
        )
      );
    }
  );
}

export function setMessages(
  messages
) {
  const messageMap =
    new Map();

  messages.forEach(
    (message) => {
      const id =
        normalizeId(message);

      if (id) {
        messageMap.set(
          id,
          message
        );
      }
    }
  );

  state.messages =
    sortMessages(
      Array.from(
        messageMap.values()
      )
    );

  rebuildMessageIds();
  renderMessages();
}

export function appendMessage(
  message,
  {
    scroll = true,
  } = {}
) {
  const messageId =
    normalizeId(message);

  if (!messageId) {
    return;
  }

  const existingIndex =
    state.messages.findIndex(
      (existingMessage) => {
        return (
          normalizeId(
            existingMessage
          ) === messageId
        );
      }
    );

  if (existingIndex !== -1) {
    state.messages[
      existingIndex
    ] = message;
  } else {
    state.messages.push(
      message
    );
  }

  state.messages =
    sortMessages(
      state.messages
    );

  rebuildMessageIds();
  renderMessages();

  if (scroll) {
    scrollMessagesToBottom();
  }
}

export function prependMessages(
  messages
) {
  const previousScrollHeight =
    dom.messageList.scrollHeight;

  setMessages([
    ...messages,
    ...state.messages,
  ]);

  const newScrollHeight =
    dom.messageList.scrollHeight;

  dom.messageList.scrollTop =
    newScrollHeight -
    previousScrollHeight;
}

export function clearMessages() {
  state.messages = [];
  state.messageIds.clear();

  dom.messageList.replaceChildren();
}

export function scrollMessagesToBottom() {
  dom.messageList.scrollTop =
    dom.messageList.scrollHeight;
}