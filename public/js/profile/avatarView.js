import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  getInitials,
  revokeUrl,
} from "./utils.js";

export function updateAvatarView(
  user
) {
  const displayName =
    user.displayName ||
    user.username;

  if (user.avatarUrl) {
    dom.avatarImage.src =
      user.avatarUrl;

    dom.avatarImage.hidden =
      false;

    dom.avatarFallback.hidden =
      true;
  } else {
    dom.avatarImage.removeAttribute(
      "src"
    );

    dom.avatarImage.hidden = true;

    dom.avatarFallback.hidden =
      false;

    dom.avatarFallback.innerText =
      getInitials(displayName);
  }

  dom.removeAvatarButton.disabled =
    !user.avatarUrl;
}

export function previewAvatarBlob(
  blob
) {
  revokeUrl(
    state.croppedPreviewUrl
  );

  state.croppedPreviewUrl =
    URL.createObjectURL(blob);

  dom.avatarImage.src =
    state.croppedPreviewUrl;

  dom.avatarImage.hidden = false;

  dom.avatarFallback.hidden = true;

  dom.removeAvatarButton.disabled =
    false;
}