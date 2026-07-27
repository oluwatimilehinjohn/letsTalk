import {
  state,
} from "./state.js";

import {
  dom,
} from "./dom.js";

import {
  fetchCurrentUser,
} from "./api.js";

import {
  bindDirectory,
  loadRooms,
} from "./directory.js";

import {
  bindCreateRoom,
} from "./createRoom.js";

import {
  bindInviteRoom,
} from "./inviteRoom.js";

import {
  bindNavigation,
} from "./navigation.js";

import {
  bindUnreadUpdates,
} from "./unread.js";

import {
  initializeDirectMessageBadge,
} from "./directMessages.js";

function normalizeCurrentUser(
  result
) {
  return (
    result?.user ||
    result?.currentUser ||
    result
  );
}

function renderCurrentUser() {
  const user =
    state.currentUser;

  if (!user) {
    dom.currentUser.textContent =
      "";

    return;
  }

  dom.currentUser.textContent =
    user.displayName ||
    user.username ||
    "Profile";

  if (user.username) {
    dom.currentUser.title =
      `@${user.username}`;
  }
}

async function initializeRoomsPage() {
  try {
    const authResult =
      await fetchCurrentUser();

    if (!authResult) {
      window.location.href =
        "/";

      return;
    }

    state.currentUser =
      normalizeCurrentUser(
        authResult
      );

    renderCurrentUser();

    bindDirectory();
    bindCreateRoom();
    bindInviteRoom();
    bindNavigation();
    bindUnreadUpdates();

    await Promise.all([
      loadRooms(),

      initializeDirectMessageBadge(),
    ]);
  } catch (error) {
    console.error(
      "Room directory initialization error:",
      error
    );

    if (
      dom.directoryStatus
    ) {
      dom.directoryStatus.textContent =
        error.message ||
        "Unable to load the room directory.";

      dom.directoryStatus.dataset.type =
        "error";
    }
  }
}

initializeRoomsPage();