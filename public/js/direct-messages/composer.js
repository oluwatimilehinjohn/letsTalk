import {
  dom,
} from "./dom.js";

import {
  state,
} from "./state.js";

import {
  appendMessage,
} from "./messages.js";

import {
  sendDirectMessage,
  sendTypingStart,
  sendTypingStop,
} from "./socket.js";

import {
  setPageStatus,
} from "./conversations.js";

let typingActive = false;
let typingTimer = null;

function resizeComposer() {
  dom.messageInput.style.height =
    "auto";

  dom.messageInput.style.height =
    `${Math.min(
      dom.messageInput.scrollHeight,
      150
    )}px`;
}

function stopTyping() {
  window.clearTimeout(
    typingTimer
  );

  if (
    !typingActive ||
    !state.activeConversationId
  ) {
    typingActive = false;
    return;
  }

  typingActive = false;

  sendTypingStop(
    state.activeConversationId
  ).catch(() => {});
}

function handleTypingInput() {
  resizeComposer();

  if (
    !state.activeConversationId
  ) {
    return;
  }

  const hasText =
    Boolean(
      dom.messageInput.value.trim()
    );

  if (
    hasText &&
    !typingActive
  ) {
    typingActive = true;

    sendTypingStart(
      state.activeConversationId
    ).catch(() => {});
  }

  if (!hasText) {
    stopTyping();
    return;
  }

  window.clearTimeout(
    typingTimer
  );

  typingTimer =
    window.setTimeout(
      stopTyping,
      1100
    );
}

async function handleSubmit(
  event
) {
  event.preventDefault();

  const conversationId =
    state.activeConversationId;

  const text =
    dom.messageInput.value.trim();

  if (
    !conversationId ||
    !text
  ) {
    return;
  }

  dom.sendButton.disabled =
    true;

  setPageStatus("");

  try {
    const result =
      await sendDirectMessage({
        conversationId,
        text,
      });

    dom.messageInput.value =
      "";

    resizeComposer();
    stopTyping();

    if (result.message) {
      appendMessage(
        result.message,
        {
          scroll: true,
        }
      );
    }

    dom.messageInput.focus();
  } catch (error) {
    setPageStatus(
      error.message,
      "error"
    );
  } finally {
    dom.sendButton.disabled =
      false;
  }
}

export function bindComposer() {
  dom.composer.addEventListener(
    "submit",
    handleSubmit
  );

  dom.messageInput.addEventListener(
    "input",
    handleTypingInput
  );

  dom.messageInput.addEventListener(
    "blur",
    stopTyping
  );

  dom.messageInput.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        dom.composer.requestSubmit();
      }
    }
  );
}