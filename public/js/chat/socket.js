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
    socket.emit("joinRoom", {
      room: state.room,
    });
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