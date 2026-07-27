import { state } from "./state.js";

import {
  fetchReadSummary,
} from "./api.js";

import {
  renderRooms,
} from "./view.js";

let socket = null;

function sortRoomsByActivity() {
  state.rooms.sort(
    (firstRoom, secondRoom) => {
      const firstTime =
        firstRoom.lastMessageAt
          ? new Date(
              firstRoom.lastMessageAt
            ).getTime()
          : 0;

      const secondTime =
        secondRoom.lastMessageAt
          ? new Date(
              secondRoom.lastMessageAt
            ).getTime()
          : 0;

      if (
        firstTime !== secondTime
      ) {
        return (
          secondTime -
          firstTime
        );
      }

      if (
        firstRoom.isSystem !==
        secondRoom.isSystem
      ) {
        return firstRoom.isSystem
          ? -1
          : 1;
      }

      return firstRoom.name.localeCompare(
        secondRoom.name
      );
    }
  );
}

function findRoom(roomId) {
  return state.rooms.find(
    (room) => {
      return (
        String(room.id) ===
        String(roomId)
      );
    }
  );
}

export async function loadUnreadSummary() {
  const result =
    await fetchReadSummary();

  const summaryMap =
    new Map(
      (result.rooms || []).map(
        (summary) => {
          return [
            String(
              summary.roomId
            ),
            summary,
          ];
        }
      )
    );

  state.rooms.forEach((room) => {
    const summary =
      summaryMap.get(
        String(room.id)
      );

    room.unreadCount =
      summary?.unreadCount || 0;

    room.lastMessageAt =
      summary?.lastMessageAt ||
      room.lastMessageAt ||
      null;
  });

  sortRoomsByActivity();
}

function handleRoomActivity(
  activity
) {
  const room =
    findRoom(
      activity.roomId
    );

  if (!room) {
    return;
  }

  room.lastMessageAt =
    activity.lastMessageAt;

  if (
    activity.shouldIncrement
  ) {
    room.unreadCount =
      Number(
        room.unreadCount || 0
      ) + 1;
  }

  sortRoomsByActivity();
  renderRooms();
}

function handleRoomReadUpdated(
  update
) {
  const room =
    findRoom(
      update.roomId
    );

  if (!room) {
    return;
  }

  room.unreadCount = 0;

  renderRooms();
}

export function bindUnreadUpdates() {
  if (
    typeof window.io !==
    "function"
  ) {
    return;
  }

  socket = window.io();

  socket.on(
    "roomActivity",
    handleRoomActivity
  );

  socket.on(
    "roomReadUpdated",
    handleRoomReadUpdated
  );
}