import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  truncateText,
} from "./utils.js";

export function clearSelectedMessage() {
  if (state.selectedMessageId) {
    document
      .getElementById(
        `message-${state.selectedMessageId}`
      )
      ?.classList.remove(
        "message-row-selected"
      );
  }

  state.selectedMessageId = null;

  dom.messageActions.hidden = true;
}

export function selectMessage(
  messageId
) {
  const message =
    state.messageStore.get(
      messageId
    );

  if (!message?.userId) {
    return;
  }

  clearSelectedMessage();

  state.selectedMessageId =
    messageId;

  document
    .getElementById(
      `message-${messageId}`
    )
    ?.classList.add(
      "message-row-selected"
    );

  const author =
    message.displayName ||
    message.username;

  dom.messageActionsPreview.innerText =
    `${author}: ${truncateText(
      message.text,
      70
    )}`;

  dom.messageActions.hidden = false;
}

export function startReply(message) {
  state.replyingToMessage =
    message;

  const author =
    message.displayName ||
    message.username;

  dom.replyAuthor.innerText =
    `Replying to ${author}`;

  dom.replyText.innerText =
    truncateText(
      message.text,
      130
    );

  dom.replyPreview.hidden = false;

  dom.messageInput.focus();
}

export function clearReply() {
  state.replyingToMessage = null;

  dom.replyPreview.hidden = true;

  dom.replyAuthor.innerText =
    "Replying to";

  dom.replyText.innerText = "";
}

export function bindMessageActions(
  reactToMessage
) {
  dom.replyActionButton.addEventListener(
    "click",
    () => {
      const message =
        state.messageStore.get(
          state.selectedMessageId
        );

      if (!message) {
        return;
      }

      startReply(message);
      clearSelectedMessage();
    }
  );

  dom.quickReactionButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          if (
            !state.selectedMessageId
          ) {
            return;
          }

          reactToMessage(
            state.selectedMessageId,
            button.dataset.emoji
          );

          clearSelectedMessage();
        }
      );
    }
  );

  dom.closeActionsButton.addEventListener(
    "click",
    clearSelectedMessage
  );

  dom.cancelReplyButton.addEventListener(
    "click",
    clearReply
  );
}