import { dom } from "./dom.js";

import {
  changePassword,
} from "./api.js";

import {
  setStatus,
  clearStatus,
} from "./utils.js";

export function bindPasswordForm() {
  dom.passwordForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      clearStatus(
        "password-status"
      );

      dom.passwordSubmit.disabled =
        true;

      dom.passwordSubmit.innerText =
        "Updating...";

      try {
        await changePassword({
          currentPassword:
            dom.passwordForm
              .elements
              .currentPassword
              .value,

          newPassword:
            dom.passwordForm
              .elements
              .newPassword
              .value,
        });

        dom.passwordForm.reset();

        setStatus(
          "password-status",
          "Password changed."
        );
      } catch (error) {
        setStatus(
          "password-status",
          error.message,
          "error"
        );
      } finally {
        dom.passwordSubmit.disabled =
          false;

        dom.passwordSubmit.innerText =
          "Change password";
      }
    }
  );
}