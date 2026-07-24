import { dom } from "./dom.js";

import {
  CURRENT_ROOM_KEY,
} from "./state.js";

import {
  logoutUser,
} from "./api.js";

export function bindNavigation(socket) {
  dom.leaveButton.addEventListener(
    "click",
    () => {
      const confirmed = confirm(
        "Are you sure you want to leave this room?"
      );

      if (!confirmed) {
        return;
      }

      sessionStorage.removeItem(
        CURRENT_ROOM_KEY
      );

      window.location.href =
        "/rooms";
    }
  );

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

        socket.disconnect();

        window.location.replace("/");
      }
    }
  );
}