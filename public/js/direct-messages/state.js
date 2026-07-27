export const state = {
  currentUser: null,

  conversations: [],

  activeConversationId: null,

  activeConversation: null,

  messages: [],

  messageIds: new Set(),

  nextCursor: null,

  hasMoreMessages: false,

  loadingMessages: false,

  activationToken: 0,

  presenceByUserId: new Map(),

  typingConversationId: null,
};

export function normalizeId(value) {
  return String(
    value?._id ||
    value?.id ||
    value ||
    ""
  ).trim();
}

export function getCurrentUserId() {
  return normalizeId(
    state.currentUser
  );
}