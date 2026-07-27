import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  updateRoom,
} from "./api.js";

import {
  showInviteCode,
} from "./inviteCodes.js";

function setPageStatus(
  message,
  type = ""
) {
  dom.pageStatus.innerText =
    message;

  dom.pageStatus.dataset.type =
    type;
}

function updateCounter() {
  dom.descriptionCounter.innerText =
    `${dom.roomDescriptionInput.value.length}/160`;
}

function updateJoinPolicy() {
  const isPrivate =
    dom.visibilitySelect.value ===
    "private";

  if (isPrivate) {
    dom.joinPolicySelect.value =
      "invite";
  }

  dom.joinPolicySelect.disabled =
    isPrivate ||
    state.room?.role !== "owner";
}

export function renderRoomDetails() {
  const room = state.room;

  if (!room) {
    return;
  }

  dom.roomTitle.innerText =
    room.name;

  dom.roomDescription.innerText =
    room.description ||
    "No room description has been added.";

  dom.roleBadge.innerText =
    room.role || "member";

  dom.roleBadge.className =
    `room-badge room-badge-${room.role}`;

  dom.roomNameInput.value =
    room.name;

  dom.roomDescriptionInput.value =
    room.description || "";

  dom.visibilitySelect.value =
    room.visibility;

  dom.joinPolicySelect.value =
    room.joinPolicy;

  const isOwner =
    room.role === "owner";

  dom.visibilitySelect.disabled =
    !isOwner;

  dom.joinPolicySelect.disabled =
    !isOwner ||
    room.visibility === "private";

  dom.ownerSettingsHelp.hidden =
    isOwner;

  updateCounter();
  updateJoinPolicy();
}

async function submitRoomSettings(
  event
) {
  event.preventDefault();

  dom.saveRoomButton.disabled =
    true;

  dom.saveRoomButton.innerText =
    "Saving...";

  setPageStatus("");

  const updates = {
    name:
      dom.roomNameInput.value,

    description:
      dom.roomDescriptionInput.value,
  };

  if (
    state.room.role === "owner"
  ) {
    updates.visibility =
      dom.visibilitySelect.value;

    updates.joinPolicy =
      dom.joinPolicySelect.value;
  }

  try {
    const result =
      await updateRoom(
        state.identifier,
        updates
      );

    state.room =
      result.room;

    renderRoomDetails();

    if (result.inviteCode) {
      showInviteCode(
        result.inviteCode
      );
    }

    setPageStatus(
      "Room settings saved."
    );
  } catch (error) {
    setPageStatus(
      error.message,
      "error"
    );
  } finally {
    dom.saveRoomButton.disabled =
      false;

    dom.saveRoomButton.innerHTML =
      '<i class="fas fa-save"></i><span>Save changes</span>';
  }
}

export function bindRoomDetails() {
  dom.roomForm.addEventListener(
    "submit",
    submitRoomSettings
  );

  dom.roomDescriptionInput.addEventListener(
    "input",
    updateCounter
  );

  dom.visibilitySelect.addEventListener(
    "change",
    updateJoinPolicy
  );
}