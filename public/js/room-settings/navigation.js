import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  archiveRoom,
  leaveRoom,
  logoutUser,
} from "./api.js";

const CURRENT_ROOM_KEY =
  "letstalk.currentRoom";

function setPageStatus(
  message,
  type = ""
) {
  dom.pageStatus.innerText =
    message;

  dom.pageStatus.dataset.type =
    type;
}

function enterRoom() {
  if (!state.room?.slug) {
    return;
  }

  sessionStorage.setItem(
    CURRENT_ROOM_KEY,
    state.room.slug
  );

  window.location.href =
    `/chat?room=${encodeURIComponent(
      state.room.slug
    )}`;
}

export function renderNavigationPermissions() {
  const role =
    state.room?.role;

  dom.leaveRoomRow.hidden =
    role === "owner";

  dom.archiveRoomRow.hidden =
    role !== "owner" ||
    state.room?.isSystem;
}

async function handleLeaveRoom() {
  const confirmed =
    window.confirm(
      `Leave ${state.room.name}?`
    );

  if (!confirmed) {
    return;
  }

  dom.leaveRoomButton.disabled =
    true;

  dom.leaveRoomButton.innerText =
    "Leaving...";

  try {
    await leaveRoom(
      state.identifier
    );

    sessionStorage.removeItem(
      CURRENT_ROOM_KEY
    );

    window.location.replace(
      "/rooms"
    );
  } catch (error) {
    setPageStatus(
      error.message,
      "error"
    );

    dom.leaveRoomButton.disabled =
      false;

    dom.leaveRoomButton.innerText =
      "Leave room";
  }
}

async function handleArchiveRoom() {
  const confirmed =
    window.confirm(
      `Archive ${state.room.name}? Members will no longer be able to enter it.`
    );

  if (!confirmed) {
    return;
  }

  const secondConfirmation =
    window.confirm(
      "This action hides the room. Continue?"
    );

  if (!secondConfirmation) {
    return;
  }

  dom.archiveRoomButton.disabled =
    true;

  dom.archiveRoomButton.innerText =
    "Archiving...";

  try {
    await archiveRoom(
      state.identifier
    );

    sessionStorage.removeItem(
      CURRENT_ROOM_KEY
    );

    window.location.replace(
      "/rooms"
    );
  } catch (error) {
    setPageStatus(
      error.message,
      "error"
    );

    dom.archiveRoomButton.disabled =
      false;

    dom.archiveRoomButton.innerText =
      "Archive room";
  }
}

async function handleLogout() {
  try {
    await logoutUser();
  } catch (error) {
    console.error(
      "Logout error:",
      error
    );
  } finally {
    sessionStorage.removeItem(
      CURRENT_ROOM_KEY
    );

    window.location.replace("/");
  }
}

export function bindNavigation() {
  dom.enterRoomButton.addEventListener(
    "click",
    enterRoom
  );

  dom.leaveRoomButton.addEventListener(
    "click",
    handleLeaveRoom
  );

  dom.archiveRoomButton.addEventListener(
    "click",
    handleArchiveRoom
  );

  dom.logoutButton.addEventListener(
    "click",
    handleLogout
  );
}