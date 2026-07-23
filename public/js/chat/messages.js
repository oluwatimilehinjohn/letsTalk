import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  getInitials,
  getProfileHref,
  truncateText,
} from "./utils.js";

let selectMessageHandler =
  () => {};

let reactionHandler =
  () => {};

export function configureMessageHandlers({
  onSelectMessage,
  onReaction,
}) {
  if (
    typeof onSelectMessage ===
    "function"
  ) {
    selectMessageHandler =
      onSelectMessage;
  }

  if (
    typeof onReaction === "function"
  ) {
    reactionHandler = onReaction;
  }
}

function createAvatar(message) {
  const displayName =
    message.displayName ||
    message.username;

  const link =
    document.createElement("a");

  link.classList.add(
    "message-avatar"
  );

  link.href =
    getProfileHref(
      message.username
    );

  if (message.avatarUrl) {
    const image =
      document.createElement("img");

    image.src =
      message.avatarUrl;

    image.alt =
      `${displayName}'s avatar`;

    link.appendChild(image);

    return link;
  }

  const fallback =
    document.createElement("span");

  fallback.innerText =
    getInitials(displayName);

  link.appendChild(fallback);

  return link;
}

function createReplyReference(
  replyTo
) {
  const reference =
    document.createElement("button");

  reference.type = "button";

  reference.classList.add(
    "reply-reference"
  );

  const author =
    document.createElement("strong");

  author.innerText =
    replyTo.displayName ||
    replyTo.username ||
    "Unknown user";

  const text =
    document.createElement("span");

  text.innerText =
    truncateText(
      replyTo.text,
      100
    );

  reference.appendChild(author);
  reference.appendChild(text);

  reference.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();

      scrollToMessage(replyTo.id);
    }
  );

  return reference;
}

function createMetadata(
  message,
  isOwnMessage
) {
  const metadata =
    document.createElement("p");

  metadata.classList.add("meta");

  const authorName =
    message.displayName ||
    message.username;

  if (message.userId) {
    const authorLink =
      document.createElement("a");

    authorLink.href =
      getProfileHref(
        message.username
      );

    authorLink.innerText =
      isOwnMessage
        ? `${authorName} · You`
        : authorName;

    metadata.appendChild(
      authorLink
    );
  } else {
    const author =
      document.createElement("span");

    author.innerText =
      authorName;

    metadata.appendChild(author);
  }

  const time =
    document.createElement("span");

  time.innerText = message.time;

  metadata.appendChild(time);

  return metadata;
}

function createReactionButton(
  messageId,
  reaction
) {
  const button =
    document.createElement("button");

  button.type = "button";

  button.classList.add(
    "reaction-pill"
  );

  const userIds =
    Array.isArray(
      reaction.userIds
    )
      ? reaction.userIds
      : [];

  if (
    state.currentUser &&
    userIds.includes(
      state.currentUser.id
    )
  ) {
    button.classList.add(
      "reaction-pill-active"
    );
  }

  const emoji =
    document.createElement("span");

  emoji.innerText =
    reaction.emoji;

  const count =
    document.createElement("strong");

  count.innerText =
    String(userIds.length);

  button.appendChild(emoji);
  button.appendChild(count);

  button.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();

      reactionHandler(
        messageId,
        reaction.emoji
      );
    }
  );

  return button;
}

export function renderReactions(
  messageId,
  reactions = []
) {
  if (!messageId) {
    return;
  }

  const row =
    document.getElementById(
      `message-${messageId}`
    );

  const container =
    row?.querySelector(
      ".message-reactions"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const activeReactions =
    reactions.filter(
      (reaction) =>
        Array.isArray(
          reaction.userIds
        ) &&
        reaction.userIds.length > 0
    );

  container.hidden =
    activeReactions.length === 0;

  activeReactions.forEach(
    (reaction) => {
      container.appendChild(
        createReactionButton(
          messageId,
          reaction
        )
      );
    }
  );
}

export function outputMessage(message) {
  const isSystemMessage =
    !message.userId;

  const isOwnMessage =
    message.userId ===
    state.currentUser?.id;

  if (message.id) {
    state.messageStore.set(
      message.id,
      message
    );
  }

  const row =
    document.createElement("div");

  row.classList.add(
    "message-row"
  );

  if (message.id) {
    row.id =
      `message-${message.id}`;

    row.dataset.messageId =
      message.id;
  }

  if (isOwnMessage) {
    row.classList.add(
      "message-row-own"
    );
  }

  if (isSystemMessage) {
    row.classList.add(
      "message-row-system"
    );
  }

  const article =
    document.createElement("article");

  article.classList.add("message");

  if (
    message.replyTo?.id
  ) {
    article.appendChild(
      createReplyReference(
        message.replyTo
      )
    );
  }

  article.appendChild(
    createMetadata(
      message,
      isOwnMessage
    )
  );

  const text =
    document.createElement("p");

  text.classList.add("text");
  text.innerText = message.text;

  article.appendChild(text);

  const reactions =
    document.createElement("div");

  reactions.classList.add(
    "message-reactions"
  );

  reactions.hidden = true;

  article.appendChild(reactions);

  if (
    message.userId &&
    !isOwnMessage
  ) {
    row.appendChild(
      createAvatar(message)
    );
  }

  row.appendChild(article);

  if (
    message.userId &&
    isOwnMessage
  ) {
    row.appendChild(
      createAvatar(message)
    );
  }

  if (
    message.id &&
    message.userId
  ) {
    article.addEventListener(
      "click",
      (event) => {
        if (
          event.target.closest(
            "a, button"
          )
        ) {
          return;
        }

        selectMessageHandler(
          message.id
        );
      }
    );
  }

  dom.chatMessages.appendChild(row);

  renderReactions(
    message.id,
    message.reactions
  );
}

export function scrollToMessage(
  messageId
) {
  const target =
    document.getElementById(
      `message-${messageId}`
    );

  if (!target) {
    alert(
      "The original message is outside the loaded history."
    );

    return;
  }

  target.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  target.classList.add(
    "message-row-highlight"
  );

  window.setTimeout(() => {
    target.classList.remove(
      "message-row-highlight"
    );
  }, 1800);
}

export function scrollToLatestMessage() {
  dom.chatMessages.scrollTop =
    dom.chatMessages.scrollHeight;
}