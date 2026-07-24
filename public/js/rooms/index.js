import {
  bindDirectory,
  loadRooms,
} from "./directory.js";

import {
  bindCreateRoom,
} from "./createRoom.js";

import {
  bindInviteRoom,
} from "./inviteRoom.js";

import {
  bindNavigation,
  loadCurrentUser,
} from "./navigation.js";

bindDirectory();
bindCreateRoom();
bindInviteRoom();
bindNavigation();

async function startRoomDirectory() {
  try {
    const user =
      await loadCurrentUser();

    if (!user) {
      window.location.replace("/");
      return;
    }

    await loadRooms();
  } catch (error) {
    console.error(
      "Room directory startup error:",
      error
    );

    window.location.replace("/");
  }
}

startRoomDirectory();