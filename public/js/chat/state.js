export const CURRENT_ROOM_KEY =
  "letstalk.currentRoom";

const searchParams =
  new URLSearchParams(
    window.location.search
  );

export const state = {
  room: searchParams.get("room"),

  currentUser: null,

  selectedMessageId: null,

  replyingToMessage: null,

  messageStore: new Map(),
};