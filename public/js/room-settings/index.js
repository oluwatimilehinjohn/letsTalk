import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  fetchCurrentUser,
  fetchRoom,
} from "./api.js";

import {
  bindRoomDetails,
  renderRoomDetails,
} from "./roomDetails.js";

import {
  bindMembers,
  loadMembers,
} from "./members.js";

import {
  bindInviteCodes,
  renderInvitePermissions,
} from "./inviteCodes.js";

import {
  bindOwnership,
  renderOwnershipPermissions,
} from "./ownership.js";

import {
  bindNavigation,
  renderNavigationPermissions,
} from "./navigation.js";

function getRoomIdentifier() {
  const segments =
    window.location.pathname
      .split("/")
      .filter(Boolean);

  const settingsIndex =
    segments.lastIndexOf(
      "settings"
    );

  if (settingsIndex < 1) {
    return "";
  }

  return decodeURIComponent(
    segments[
      settingsIndex - 1
    ]
  );
}

function setPageStatus(
  message,
  type = ""
) {
  dom.pageStatus.innerText =
    message;

  dom.pageStatus.dataset.type =
    type;
}

bindRoomDetails();
bindMembers();
bindInviteCodes();
bindOwnership();
bindNavigation();

async function startRoomSettings() {
  try {
    state.identifier =
      getRoomIdentifier();

    if (!state.identifier) {
      window.location.replace(
        "/rooms"
      );

      return;
    }

    setPageStatus(
      "Loading room settings..."
    );

    const currentUserResult =
      await fetchCurrentUser();

    if (!currentUserResult) {
      window.location.replace("/");
      return;
    }

    state.currentUser =
      currentUserResult.user;

    dom.currentUser.innerText =
      state.currentUser.displayName ||
      state.currentUser.username;

    const roomResult =
      await fetchRoom(
        state.identifier
      );

    state.room =
      roomResult.room;

    if (
      ![
        "owner",
        "admin",
      ].includes(
        state.room.role
      )
    ) {
      window.location.replace(
        "/rooms"
      );

      return;
    }

    renderRoomDetails();
    renderInvitePermissions();
    renderOwnershipPermissions();
    renderNavigationPermissions();

    await loadMembers();

    setPageStatus("");
  } catch (error) {
    console.error(
      "Room settings startup error:",
      error
    );

    setPageStatus(
      error.message,
      "error"
    );
  }
}

startRoomSettings();