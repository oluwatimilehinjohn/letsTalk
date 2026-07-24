import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  fetchCurrentUser,
  logoutUser,
} from "./api.js";

const CURRENT_ROOM_KEY =
  "letstalk.currentRoom";

export async function loadCurrentUser() {
  const result =
    await fetchCurrentUser();

  if (!result) {
    return null;
  }

  state.currentUser =
    result.user;

  dom.currentUser.innerText =
    result.user.displayName ||
    result.user.username;

  dom.currentUser.href =
    "/profile";

  return result.user;
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