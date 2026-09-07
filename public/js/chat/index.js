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

import {
  startReadTracking,
} from "./readTracking.js";

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

startReadTracking();

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

function updateSearch() {
  const query = dom.searchInput.value.trim().toLowerCase();
  let matches = 0;

  document.querySelectorAll(".message-row").forEach((row) => {
    const match = !query || row.textContent.toLowerCase().includes(query);
    row.classList.toggle("message-search-hidden", !match);
    if (query && match) matches += 1;
  });

  dom.searchCount.textContent = query ? `${matches} result${matches === 1 ? "" : "s"}` : "Type to search";
}

function setSearchOpen(open) {
  dom.searchPanel.hidden = !open;
  dom.searchToggle.setAttribute("aria-expanded", String(open));
  if (open) dom.searchInput.focus();
  if (!open) {
    dom.searchInput.value = "";
    updateSearch();
  }
}

dom.searchToggle.addEventListener("click", () => setSearchOpen(dom.searchPanel.hidden));
dom.searchClose.addEventListener("click", () => setSearchOpen(false));
dom.searchInput.addEventListener("input", updateSearch);
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
    event.preventDefault();
    setSearchOpen(true);
  }
  if (event.key === "Escape" && !dom.searchPanel.hidden) setSearchOpen(false);
});

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
