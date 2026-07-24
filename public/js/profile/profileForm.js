import { dom } from "./dom.js";

import {
  updateProfile,
} from "./api.js";

import {
  renderProfile,
  updateBioCounter,
} from "./view.js";

import {
  setStatus,
  clearStatus,
} from "./utils.js";

export function bindProfileForm() {
  dom.bioInput.addEventListener(
    "input",
    updateBioCounter
  );

  dom.profileForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      clearStatus(
        "profile-status"
      );

      dom.profileSubmit.disabled =
        true;

      dom.profileSubmit.innerText =
        "Saving...";

      try {
        const result =
          await updateProfile({
            displayName:
              dom.profileForm
                .elements
                .displayName
                .value,

            bio:
              dom.profileForm
                .elements
                .bio
                .value,
          });

        renderProfile(result.user);

        setStatus(
          "profile-status",
          "Profile saved."
        );
      } catch (error) {
        setStatus(
          "profile-status",
          error.message,
          "error"
        );
      } finally {
        dom.profileSubmit.disabled =
          false;

        dom.profileSubmit.innerText =
          "Save profile";
      }
    }
  );
}