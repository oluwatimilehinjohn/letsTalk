import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  generateInviteCode,
} from "./api.js";

function setInviteStatus(
  message,
  type = ""
) {
  dom.inviteStatus.innerText =
    message;

  dom.inviteStatus.dataset.type =
    type;
}

async function copyText(text) {
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

  temporaryInput.value = text;

  temporaryInput.style.position =
    "fixed";

  temporaryInput.style.opacity =
    "0";

  document.body.appendChild(
    temporaryInput
  );

  temporaryInput.focus();
  temporaryInput.select();

  document.execCommand("copy");

  temporaryInput.remove();
}

export function showInviteCode(code) {
  dom.inviteCode.innerText =
    code;

  dom.inviteResult.hidden =
    false;

  setInviteStatus(
    "Copy this code now. It cannot be displayed again later."
  );
}

export function renderInvitePermissions() {
  const isOwner =
    state.room?.role === "owner";

  dom.inviteSection.hidden =
    !isOwner;

  dom.inviteResult.hidden =
    true;

  dom.inviteCode.innerText =
    "";
}

async function handleGenerateCode() {
  const confirmed =
    window.confirm(
      "Generate a new invite code? The previous code will stop working."
    );

  if (!confirmed) {
    return;
  }

  dom.generateInviteButton.disabled =
    true;

  dom.generateInviteButton.innerText =
    "Generating...";

  setInviteStatus("");

  try {
    const result =
      await generateInviteCode(
        state.identifier
      );

    showInviteCode(
      result.inviteCode
    );
  } catch (error) {
    setInviteStatus(
      error.message,
      "error"
    );
  } finally {
    dom.generateInviteButton.disabled =
      false;

    dom.generateInviteButton.innerHTML =
      '<i class="fas fa-sync-alt"></i><span>Generate new code</span>';
  }
}

async function handleCopyCode() {
  const code =
    dom.inviteCode.innerText.trim();

  if (!code) {
    return;
  }

  try {
    await copyText(code);

    setInviteStatus(
      "Invite code copied."
    );

    dom.copyInviteButton.innerHTML =
      '<i class="fas fa-check"></i>';

    window.setTimeout(() => {
      dom.copyInviteButton.innerHTML =
        '<i class="fas fa-copy"></i>';
    }, 1500);
  } catch (error) {
    setInviteStatus(
      "Unable to copy the invite code.",
      "error"
    );
  }
}

export function bindInviteCodes() {
  dom.generateInviteButton.addEventListener(
    "click",
    handleGenerateCode
  );

  dom.copyInviteButton.addEventListener(
    "click",
    handleCopyCode
  );
}