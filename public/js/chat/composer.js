import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  clearReply,
} from "./actions.js";

export function bindComposer(socket) {
  dom.chatForm.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const message =
        dom.messageInput.value.trim();

      if (!message) {
        return;
      }

      if (message.length > 1000) {
        alert(
          "Messages cannot exceed 1,000 characters."
        );

        return;
      }

      dom.sendButton.disabled = true;

      socket.emit(
        "chatMessage",
        {
          text: message,

          replyToId:
            state
              .replyingToMessage
              ?.id || null,
        },
        (result) => {
          dom.sendButton.disabled =
            false;

          if (!result?.ok) {
            alert(
              result?.error ||
              "Your message could not be sent."
            );

            return;
          }

          dom.messageInput.value =
            "";

          clearReply();

          dom.messageInput.focus();
        }
      );
    }
  );
}