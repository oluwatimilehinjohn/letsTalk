import {
  state,
  normalizeId,
} from "./state.js";

export function setPresence(
  userId,
  isOnline
) {
  const normalizedUserId =
    normalizeId(userId);

  if (!normalizedUserId) {
    return;
  }

  state.presenceByUserId.set(
    normalizedUserId,
    Boolean(isOnline)
  );
}

export function isUserOnline(
  userId
) {
  return Boolean(
    state.presenceByUserId.get(
      normalizeId(userId)
    )
  );
}

export function applyPresenceSnapshot(
  presence = []
) {
  presence.forEach((entry) => {
    setPresence(
      entry.userId,
      entry.isOnline
    );
  });
}

export function getConversationUserIds() {
  return state.conversations
    .map((conversation) => {
      return normalizeId(
        conversation.otherUser
      );
    })
    .filter(Boolean);
}