import {
  dom,
} from "./dom.js";

import {
  logoutUser,
} from "./api.js";

export function bindNavigation() {
  dom.logoutButton.addEventListener(
    "click",
    async () => {
      dom.logoutButton.disabled =
        true;

      try {
        await logoutUser();

        window.location.href =
          "/";
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );

        dom.logoutButton.disabled =
          false;
      }
    }
  );
}