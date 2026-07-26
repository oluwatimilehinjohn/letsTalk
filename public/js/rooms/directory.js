import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  fetchRooms,
  joinRoom,
  leaveRoom,
} from "./api.js";

import {
  renderRooms,
  setDirectoryStatus,
} from "./view.js";

import {
  openJoinInviteModal,
  openOwnerInviteModal,
} from "./inviteRoom.js";

const CURRENT_ROOM_KEY =
  "letstalk.currentRoom";

function enterRoom(slug) {
  sessionStorage.setItem(
    CURRENT_ROOM_KEY,
    slug
  );

  window.location.href =
    `/chat?room=${encodeURIComponent(
      slug
    )}`;
}

export async function loadRooms() {
  dom.refreshButton.disabled =
    true;

  setDirectoryStatus(
    "Loading rooms..."
  );

  try {
    const result =
      await fetchRooms();

    state.rooms =
      result.rooms || [];

    renderRooms();

    setDirectoryStatus("");
  } catch (error) {
    setDirectoryStatus(
      error.message,
      "error"
    );
  } finally {
    dom.refreshButton.disabled =
      false;
  }
}

async function handleOpenRoomJoin(
  button
) {
  const slug =
    button.dataset.roomSlug;

  button.disabled = true;

  button.innerText =
    "Joining...";

  try {
    await joinRoom(slug);

    enterRoom(slug);
  } catch (error) {
    button.disabled = false;

    button.innerHTML =
      '<i class="fas fa-sign-in-alt"></i><span>Join</span>';

    setDirectoryStatus(
      error.message,
      "error"
    );
  }
}

async function handleLeaveRoom(
  button
) {
  const slug =
    button.dataset.roomSlug;

  const roomName =
    button.dataset.roomName;

  const confirmed =
    window.confirm(
      `Leave ${roomName}?`
    );

  if (!confirmed) {
    return;
  }

  button.disabled = true;

  button.innerText =
    "Leaving...";

  try {
    await leaveRoom(slug);

    const savedRoom =
      sessionStorage.getItem(
        CURRENT_ROOM_KEY
      );

    if (savedRoom === slug) {
      sessionStorage.removeItem(
        CURRENT_ROOM_KEY
      );
    }

    await loadRooms();

    setDirectoryStatus(
      `You left ${roomName}.`
    );
  } catch (error) {
    button.disabled = false;

    button.innerHTML =
      '<i class="fas fa-sign-out-alt"></i><span>Leave</span>';

    setDirectoryStatus(
      error.message,
      "error"
    );
  }
}

async function handleRoomAction(
  button
) {
  const slug =
    button.dataset.roomSlug;

  const roomName =
    button.dataset.roomName;

  const action =
    button.dataset.action;

  if (!slug) {
    return;
  }

  switch (action) {
    case "enter":
      enterRoom(slug);
      break;

    case "join":
      await handleOpenRoomJoin(
        button
      );
      break;

    case "join-invite":
      openJoinInviteModal();
      break;

    case "manage-invite":
      openOwnerInviteModal({
        slug,
        name: roomName,
      });
      break;

    case "settings":
      window.location.href =
        `/rooms/${encodeURIComponent(
          slug
        )}/settings`;
      break;

    case "leave":
      await handleLeaveRoom(
        button
      );
      break;

    default:
      break;
  }
}

export function bindDirectory() {
  dom.searchInput.addEventListener(
    "input",
    () => {
      state.searchQuery =
        dom.searchInput.value;

      renderRooms();
    }
  );

  dom.refreshButton.addEventListener(
    "click",
    loadRooms
  );

  dom.roomList.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "button[data-action]"
        );

      if (!button) {
        return;
      }

      handleRoomAction(button);
    }
  );
}