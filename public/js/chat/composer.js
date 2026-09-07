import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  clearReply,
} from "./actions.js";

export function bindComposer(socket) {
  const draftKey = `letstalk.draft.room.${state.room || "unknown"}`;
  const emojis = ["😀", "😂", "🥹", "😍", "😎", "🤔", "👍", "👏", "🙌", "❤️", "🔥", "✨", "🎉", "💯", "👀", "✅", "🚀", "💬"];
  let typingTimer = null;
  let typingActive = false;

  const resize = () => {
    dom.messageInput.style.height = "auto";
    dom.messageInput.style.height = `${Math.min(dom.messageInput.scrollHeight, 144)}px`;
    dom.messageCounter.textContent = `${dom.messageInput.value.length} / 4000`;
    dom.messageCounter.classList.toggle("near-limit", dom.messageInput.value.length > 3600);
  };

  const stopTyping = () => {
    window.clearTimeout(typingTimer);
    if (!typingActive) return;
    typingActive = false;
    socket.emit("roomTyping", { isTyping: false });
  };

  emojis.forEach((emoji) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = emoji;
    button.setAttribute("aria-label", `Insert ${emoji}`);
    button.addEventListener("click", () => {
      const start = dom.messageInput.selectionStart;
      const end = dom.messageInput.selectionEnd;
      dom.messageInput.setRangeText(emoji, start, end, "end");
      dom.messageInput.dispatchEvent(new Event("input"));
      dom.messageInput.focus();
    });
    dom.emojiPicker.appendChild(button);
  });

  dom.emojiToggle.addEventListener("click", () => {
    dom.emojiPicker.hidden = !dom.emojiPicker.hidden;
    dom.emojiToggle.setAttribute("aria-expanded", String(!dom.emojiPicker.hidden));
  });

  dom.messageInput.value = localStorage.getItem(draftKey) || "";
  resize();

  dom.messageInput.addEventListener("input", () => {
    resize();
    localStorage.setItem(draftKey, dom.messageInput.value);
    const hasText = Boolean(dom.messageInput.value.trim());
    if (hasText && !typingActive) {
      typingActive = true;
      socket.emit("roomTyping", { isTyping: true });
    }
    if (!hasText) stopTyping();
    window.clearTimeout(typingTimer);
    if (hasText) typingTimer = window.setTimeout(stopTyping, 1200);
  });

  dom.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      dom.chatForm.requestSubmit();
    }
  });

  dom.chatForm.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const message =
        dom.messageInput.value.trim();

      if (!message) {
        return;
      }

      if (message.length > 4000) {
        alert(
          "Messages cannot exceed 4,000 characters."
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

          localStorage.removeItem(draftKey);
          stopTyping();
          resize();

          clearReply();

          dom.messageInput.focus();
        }
      );
    }
  );
}
