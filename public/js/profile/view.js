import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  updateAvatarView,
} from "./avatarView.js";

export function updateBioCounter() {
  dom.bioCounter.innerText =
    `${dom.bioInput.value.length}/160`;
}

export function renderProfile(user) {
  state.currentProfile = user;

  const displayName =
    user.displayName ||
    user.username;

  dom.profileHeading.innerText =
    displayName;

  dom.profileUsername.innerText =
    `@${user.username}`;

  dom.profileForm.elements
    .displayName.value =
      displayName;

  dom.profileForm.elements.bio.value =
    user.bio || "";

  updateBioCounter();

  updateAvatarView(user);
}