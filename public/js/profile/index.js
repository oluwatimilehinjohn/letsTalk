import {
  fetchProfile,
} from "./api.js";

import {
  renderProfile,
} from "./view.js";

import {
  configureBackLink,
  bindNavigation,
} from "./navigation.js";

import {
  bindProfileForm,
} from "./profileForm.js";

import {
  bindPasswordForm,
} from "./passwordForm.js";

import {
  bindAvatarControls,
} from "./avatar.js";

import {
  bindCropperControls,
  cleanCropperResources,
} from "./cropper.js";

import {
  setStatus,
} from "./utils.js";

configureBackLink();

bindNavigation();

bindProfileForm();

bindPasswordForm();

bindAvatarControls();

bindCropperControls();

async function startProfile() {
  try {
    const result =
      await fetchProfile();

    if (!result) {
      window.location.replace("/");
      return;
    }

    renderProfile(result.user);
  } catch (error) {
    setStatus(
      "profile-status",
      error.message,
      "error"
    );
  }
}

window.addEventListener(
  "beforeunload",
  cleanCropperResources
);

startProfile();