import { dom } from "./dom.js";

import {
  createRoom,
} from "./api.js";

import {
  showCreatedInviteCode,
} from "./inviteRoom.js";

function setCreateStatus(
  message,
  type = ""
) {
  dom.createRoomStatus.innerText =
    message;

  dom.createRoomStatus.dataset.type =
    type;
}

function updateDescriptionCounter() {
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
    isPrivate;
}

export function openCreateRoomModal() {
  dom.modal.hidden = false;

  document.body.classList.add(
    "modal-open"
  );

  dom.roomNameInput.focus();
}

export function closeCreateRoomModal() {
  dom.modal.hidden = true;

  const hasOpenModal =
    document.querySelector(
      ".room-modal:not([hidden])"
    );

  if (!hasOpenModal) {
    document.body.classList.remove(
      "modal-open"
    );
  }

  dom.createRoomForm.reset();

  dom.joinPolicySelect.disabled =
    false;

  dom.createRoomSubmit.disabled =
    false;

  dom.createRoomSubmit.innerHTML =
    '<i class="fas fa-plus"></i><span>Create room</span>';

  updateDescriptionCounter();
  updateJoinPolicy();

  setCreateStatus("");
}

function enterRoom(slug) {
  sessionStorage.setItem(
    "letstalk.currentRoom",
    slug
  );

  window.location.href =
    `/chat?room=${encodeURIComponent(
      slug
    )}`;
}

async function submitRoom(event) {
  event.preventDefault();

  setCreateStatus("");

  dom.createRoomSubmit.disabled =
    true;

  dom.createRoomSubmit.innerText =
    "Creating...";

  try {
    const result =
      await createRoom({
        name:
          dom.roomNameInput.value,

        description:
          dom.roomDescriptionInput.value,

        visibility:
          dom.visibilitySelect.value,

        joinPolicy:
          dom.joinPolicySelect.value,
      });

    closeCreateRoomModal();

    if (result.inviteCode) {
      showCreatedInviteCode(
        result.room,
        result.inviteCode
      );

      return;
    }

    enterRoom(result.room.slug);
  } catch (error) {
    setCreateStatus(
      error.message,
      "error"
    );

    dom.createRoomSubmit.disabled =
      false;

    dom.createRoomSubmit.innerHTML =
      '<i class="fas fa-plus"></i><span>Create room</span>';
  }
}

export function bindCreateRoom() {
  dom.openModalButton.addEventListener(
    "click",
    openCreateRoomModal
  );

  dom.closeModalButton.addEventListener(
    "click",
    closeCreateRoomModal
  );

  dom.cancelModalButton.addEventListener(
    "click",
    closeCreateRoomModal
  );

  dom.modalBackdrop.addEventListener(
    "click",
    closeCreateRoomModal
  );

  dom.visibilitySelect.addEventListener(
    "change",
    updateJoinPolicy
  );

  dom.roomDescriptionInput.addEventListener(
    "input",
    updateDescriptionCounter
  );

  dom.createRoomForm.addEventListener(
    "submit",
    submitRoom
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        !dom.modal.hidden
      ) {
        closeCreateRoomModal();
      }
    }
  );

  updateDescriptionCounter();
  updateJoinPolicy();
}