import { dom } from "./dom.js";

import {
  CURRENT_ROOM_KEY,
} from "./state.js";

import {
  logoutUser,
} from "./api.js";

export function configureBackLink() {
  const savedRoom =
    sessionStorage.getItem(
      CURRENT_ROOM_KEY
    );

  if (!savedRoom) {
    return;
  }

  dom.profileBackLink.href =
    `/chat?room=${encodeURIComponent(
      savedRoom
    )}`;

  dom.profileBackText.innerText =
    "Back to chat";
}

export function bindNavigation() {
  dom.logoutButton.addEventListener(
    "click",
    async () => {
      try {
        await logoutUser();
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );
      } finally {
        sessionStorage.removeItem(
          CURRENT_ROOM_KEY
        );

        window.location.replace("/");
      }
    }
  );
}