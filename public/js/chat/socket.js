import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  outputRoomName,
  outputUsers,
} from "./members.js";

import {
  outputMessage,
  scrollToLatestMessage,
} from "./messages.js";

import {
  applyReactionUpdate,
} from "./reactions.js";

export function createChatSocket() {
  return window.io({
    autoConnect: false,
  });
}

export function bindSocketEvents(
  socket
) {
  socket.on("connect", () => {
    dom.connectionStatus.classList.add("is-online");
    dom.connectionStatus.lastChild.textContent = " Live";
    socket.emit("joinRoom", {
      room: state.room,
    });
  });

  socket.on("disconnect", () => {
    dom.connectionStatus.classList.remove("is-online");
    dom.connectionStatus.lastChild.textContent = " Reconnecting";
  });

  socket.on("roomTyping", ({ userId, displayName, isTyping }) => {
    window.clearTimeout(state.typingUsers.get(userId));

    if (!isTyping) {
      state.typingUsers.delete(userId);
    } else {
      const timer = window.setTimeout(() => {
        state.typingUsers.delete(userId);
        updateTypingIndicator();
      }, 1800);
      state.typingUsers.set(userId, timer);
      state.typingNames.set(userId, displayName);
    }

    updateTypingIndicator();
  });

  socket.on(
    "connect_error",
    (error) => {
      console.error(error);

      if (
        error.message ===
        "UNAUTHORIZED"
      ) {
        window.location.replace("/");
      }
    }
  );

  socket.on(
    "joinError",
    (message) => {
      alert(message);

      window.location.replace(
        "/rooms"
      );
    }
  );

  socket.on(
    "roomUsers",
    ({ room, users }) => {
      outputRoomName(room);
      outputUsers(users);
    }
  );

  socket.on(
    "messageHistory",
    (messages) => {
      state.messageStore.clear();

      dom.chatMessages.innerHTML =
        "";

      messages.forEach(
        outputMessage
      );

      scrollToLatestMessage();
    }
  );

  socket.on(
    "message",
    (message) => {
      outputMessage(message);

      scrollToLatestMessage();
    }
  );

  socket.on(
    "messageReactionUpdated",
    applyReactionUpdate
  );
}

function updateTypingIndicator() {
  const names = [...state.typingUsers.keys()].map((id) => state.typingNames?.get(id)).filter(Boolean);
  dom.typingIndicator.hidden = names.length === 0;
  dom.typingIndicator.textContent = names.length > 1
    ? `${names.slice(0, 2).join(" and ")} are typing…`
    : names.length === 1 ? `${names[0]} is typing…` : "";
}
