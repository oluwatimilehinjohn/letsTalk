import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  uploadAvatar,
  removeAvatar,
} from "./api.js";

import {
  renderProfile,
} from "./view.js";

import {
  openCropper,
} from "./cropper.js";

import {
  setStatus,
  clearStatus,
  revokeUrl,
} from "./utils.js";

function resetAvatarSelection() {
  revokeUrl(
    state.croppedPreviewUrl
  );

  state.croppedPreviewUrl = null;

  state.croppedAvatarBlob = null;

  dom.avatarInput.value = "";

  dom.filePickerText.innerText =
    "Choose and crop an image";
}

async function submitAvatar(event) {
  event.preventDefault();

  clearStatus("avatar-status");

  if (!state.croppedAvatarBlob) {
    setStatus(
      "avatar-status",
      "Choose and crop an image first.",
      "error"
    );

    return;
  }

  dom.avatarSubmit.disabled =
    true;

  dom.avatarSubmit.innerText =
    "Uploading...";

  try {
    const result =
      await uploadAvatar(
        state.croppedAvatarBlob
      );

    resetAvatarSelection();

    renderProfile(result.user);

    setStatus(
      "avatar-status",
      "Avatar updated."
    );
  } catch (error) {
    setStatus(
      "avatar-status",
      error.message,
      "error"
    );
  } finally {
    dom.avatarSubmit.disabled =
      false;

    dom.avatarSubmit.innerHTML =
      '<i class="fas fa-cloud-upload-alt"></i> Upload avatar';
  }
}

async function deleteAvatar() {
  const confirmed = confirm(
    "Remove your profile image?"
  );

  if (!confirmed) {
    return;
  }

  dom.removeAvatarButton.disabled =
    true;

  try {
    const result =
      await removeAvatar();

    resetAvatarSelection();

    renderProfile(result.user);

    setStatus(
      "avatar-status",
      "Avatar removed."
    );
  } catch (error) {
    setStatus(
      "avatar-status",
      error.message,
      "error"
    );

    dom.removeAvatarButton.disabled =
      !state.currentProfile?.avatarUrl;
  }
}

export function bindAvatarControls() {
  dom.avatarInput.addEventListener(
    "change",
    () => {
      const file =
        dom.avatarInput.files[0];

      if (!file) {
        return;
      }

      dom.filePickerText.innerText =
        file.name;

      openCropper(file);
    }
  );

  dom.avatarForm.addEventListener(
    "submit",
    submitAvatar
  );

  dom.removeAvatarButton
    .addEventListener(
      "click",
      deleteAvatar
    );
}