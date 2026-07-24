import { dom } from "./dom.js";

import {
  joinRoomWithCode,
  regenerateInviteCode,
} from "./api.js";

let activeOwnerRoom = null;

function setJoinStatus(
  message,
  type = ""
) {
  dom.joinInviteStatus.innerText =
    message;

  dom.joinInviteStatus.dataset.type =
    type;
}

function setInviteCodeStatus(
  message,
  type = ""
) {
  dom.inviteCodeStatus.innerText =
    message;

  dom.inviteCodeStatus.dataset.type =
    type;
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

function openModal(modal) {
  modal.hidden = false;

  document.body.classList.add(
    "modal-open"
  );
}

function closeModal(modal) {
  modal.hidden = true;

  const openModalElement =
    document.querySelector(
      ".room-modal:not([hidden])"
    );

  if (!openModalElement) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

export function openJoinInviteModal() {
  dom.joinInviteForm.reset();

  setJoinStatus("");

  openModal(
    dom.joinInviteModal
  );

  dom.inviteRoomCode.focus();
}

export function closeJoinInviteModal() {
  closeModal(
    dom.joinInviteModal
  );

  dom.joinInviteForm.reset();

  setJoinStatus("");
}

function displayInviteCode(
  code
) {
  dom.inviteCodeValue.innerText =
    code;

  dom.inviteCodeResult.hidden =
    false;

  dom.copyInviteCodeButton.disabled =
    false;
}

function hideInviteCode() {
  dom.inviteCodeValue.innerText =
    "";

  dom.inviteCodeResult.hidden =
    true;
}

export function showCreatedInviteCode(
  room,
  inviteCode
) {
  activeOwnerRoom = {
    slug:
      room.slug,

    name:
      room.name,
  };

  dom.inviteCodeTitle.innerText =
    `Invite people to ${room.name}`;

  dom.inviteCodeDescription.innerText =
    "Your room was created. Copy this code before continuing.";

  displayInviteCode(
    inviteCode
  );

  setInviteCodeStatus(
    "This code will not be shown again after you close this window."
  );

  dom.enterInviteRoomButton.hidden =
    false;

  dom.generateInviteCodeButton.hidden =
    true;

  openModal(
    dom.inviteCodeModal
  );
}

export function openOwnerInviteModal(
  room
) {
  activeOwnerRoom =
    room;

  dom.inviteCodeTitle.innerText =
    `Invite people to ${room.name}`;

  dom.inviteCodeDescription.innerText =
    "For security, the existing code cannot be displayed. Generate a new code to share.";

  hideInviteCode();

  setInviteCodeStatus("");

  dom.enterInviteRoomButton.hidden =
    true;

  dom.generateInviteCodeButton.hidden =
    false;

  dom.generateInviteCodeButton.disabled =
    false;

  dom.generateInviteCodeButton.innerHTML =
    '<i class="fas fa-sync-alt"></i><span>Generate new code</span>';

  openModal(
    dom.inviteCodeModal
  );
}

export function closeInviteCodeModal() {
  closeModal(
    dom.inviteCodeModal
  );

  activeOwnerRoom =
    null;

  hideInviteCode();

  setInviteCodeStatus("");
}

async function handleJoinInvite(
  event
) {
  event.preventDefault();

  const inviteCode =
    dom.inviteRoomCode.value
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9]/g,
        ""
      );

  if (
    inviteCode.length !== 8
  ) {
    setJoinStatus(
      "Enter the complete 8-character invite code.",
      "error"
    );

    return;
  }

  dom.joinInviteSubmit.disabled =
    true;

  dom.joinInviteSubmit.innerText =
    "Joining...";

  setJoinStatus("");

  try {
    const result =
      await joinRoomWithCode(
        inviteCode
      );

    enterRoom(
      result.room.slug
    );
  } catch (error) {
    setJoinStatus(
      error.message,
      "error"
    );

    dom.joinInviteSubmit.disabled =
      false;

    dom.joinInviteSubmit.innerHTML =
      '<i class="fas fa-sign-in-alt"></i><span>Join room</span>';
  }
}

async function handleGenerateCode() {
  if (
    !activeOwnerRoom?.slug
  ) {
    return;
  }

  dom.generateInviteCodeButton.disabled =
    true;

  dom.generateInviteCodeButton.innerText =
    "Generating...";

  setInviteCodeStatus("");

  try {
    const result =
      await regenerateInviteCode(
        activeOwnerRoom.slug
      );

    displayInviteCode(
      result.inviteCode
    );

    dom.inviteCodeDescription.innerText =
      "Copy and share this new invite code.";

    setInviteCodeStatus(
      "A new code was generated. The previous code is no longer valid."
    );

    dom.generateInviteCodeButton.disabled =
      false;

    dom.generateInviteCodeButton.innerHTML =
      '<i class="fas fa-sync-alt"></i><span>Generate another code</span>';
  } catch (error) {
    setInviteCodeStatus(
      error.message,
      "error"
    );

    dom.generateInviteCodeButton.disabled =
      false;

    dom.generateInviteCodeButton.innerHTML =
      '<i class="fas fa-sync-alt"></i><span>Generate new code</span>';
  }
}

async function copyText(
  text
) {
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(
      text
    );

    return;
  }

  const temporaryInput =
    document.createElement(
      "textarea"
    );

  temporaryInput.value =
    text;

  temporaryInput.style.position =
    "fixed";

  temporaryInput.style.opacity =
    "0";

  document.body.appendChild(
    temporaryInput
  );

  temporaryInput.focus();
  temporaryInput.select();

  document.execCommand(
    "copy"
  );

  temporaryInput.remove();
}

async function handleCopyCode() {
  const inviteCode =
    dom.inviteCodeValue.innerText
      .trim();

  if (!inviteCode) {
    return;
  }

  try {
    await copyText(
      inviteCode
    );

    setInviteCodeStatus(
      "Invite code copied."
    );

    dom.copyInviteCodeButton.innerHTML =
      '<i class="fas fa-check"></i>';

    window.setTimeout(
      () => {
        dom.copyInviteCodeButton.innerHTML =
          '<i class="fas fa-copy"></i>';
      },
      1500
    );
  } catch (error) {
    setInviteCodeStatus(
      "Unable to copy the invite code.",
      "error"
    );
  }
}

function handleEscape(
  event
) {
  if (
    event.key !== "Escape"
  ) {
    return;
  }

  if (
    !dom.joinInviteModal.hidden
  ) {
    closeJoinInviteModal();

    return;
  }

  if (
    !dom.inviteCodeModal.hidden
  ) {
    closeInviteCodeModal();
  }
}

export function bindInviteRoom() {
  dom.openInviteRoomButton
    .addEventListener(
      "click",
      openJoinInviteModal
    );

  dom.closeJoinInviteButton
    .addEventListener(
      "click",
      closeJoinInviteModal
    );

  dom.cancelJoinInviteButton
    .addEventListener(
      "click",
      closeJoinInviteModal
    );

  dom.joinInviteBackdrop
    .addEventListener(
      "click",
      closeJoinInviteModal
    );

  dom.joinInviteForm
    .addEventListener(
      "submit",
      handleJoinInvite
    );

  dom.inviteRoomCode
    .addEventListener(
      "input",
      () => {
        dom.inviteRoomCode.value =
          dom.inviteRoomCode.value
            .toUpperCase()
            .replace(
              /[^A-Z0-9]/g,
              ""
            );
      }
    );

  dom.closeInviteCodeButton
    .addEventListener(
      "click",
      closeInviteCodeModal
    );

  dom.closeInviteCodeActionButton
    .addEventListener(
      "click",
      closeInviteCodeModal
    );

  dom.inviteCodeBackdrop
    .addEventListener(
      "click",
      closeInviteCodeModal
    );

  dom.generateInviteCodeButton
    .addEventListener(
      "click",
      handleGenerateCode
    );

  dom.copyInviteCodeButton
    .addEventListener(
      "click",
      handleCopyCode
    );

  dom.enterInviteRoomButton
    .addEventListener(
      "click",
      () => {
        if (
          activeOwnerRoom?.slug
        ) {
          enterRoom(
            activeOwnerRoom.slug
          );
        }
      }
    );

  document.addEventListener(
    "keydown",
    handleEscape
  );
}