import { dom } from "./dom.js";

import {
  state,
  CURRENT_ROOM_KEY,
} from "./state.js";

import {
  fetchCurrentUser,
} from "./api.js";

import {
  createChatSocket,
  bindSocketEvents,
} from "./socket.js";

import {
  configureMessageHandlers,
} from "./messages.js";

import {
  selectMessage,
  clearSelectedMessage,
  bindMessageActions,
} from "./actions.js";

import {
  toggleReaction,
} from "./reactions.js";

import {
  bindComposer,
} from "./composer.js";

import {
  bindSidebar,
} from "./sidebar.js";

import {
  bindNavigation,
} from "./navigation.js";

if (!state.room) {
  window.location.replace("/rooms");
} else {
  sessionStorage.setItem(
    CURRENT_ROOM_KEY,
    state.room
  );
}

const socket =
  createChatSocket();

const reactToMessage = (
  messageId,
  emoji
) => {
  toggleReaction(
    socket,
    messageId,
    emoji
  );
};

configureMessageHandlers({
  onSelectMessage: selectMessage,
  onReaction: reactToMessage,
});

bindMessageActions(
  reactToMessage
);

bindComposer(socket);

bindSidebar({
  onEscape:
    clearSelectedMessage,
});

bindNavigation(socket);

bindSocketEvents(socket);

async function startChat() {
  try {
    const user =
      await fetchCurrentUser();

    if (!user) {
      window.location.replace("/");
      return;
    }

    state.currentUser = user;

    dom.currentUser.innerText =
      user.displayName ||
      user.username;

    dom.currentUser.href =
      "/profile";

    socket.connect();
  } catch (error) {
    console.error(
      "Chat startup error:",
      error
    );

    window.location.replace("/");
  }
}

startChat();