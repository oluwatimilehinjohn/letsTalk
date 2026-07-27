function getElement(id) {
  const element =
    document.getElementById(id);

  if (!element) {
    throw new Error(
      `Required element #${id} was not found.`
    );
  }

  return element;
}

export const dom = {
  shell:
    getElement("dm-shell"),

  currentUser:
    getElement("dm-current-user"),

  logoutButton:
    getElement("dm-logout-button"),

  newConversationButton:
    getElement(
      "dm-new-conversation-button"
    ),

  emptyNewButton:
    getElement("dm-empty-new-button"),

  searchPanel:
    getElement("dm-search-panel"),

  closeSearchButton:
    getElement(
      "dm-close-search-button"
    ),

  userSearch:
    getElement("dm-user-search"),

  searchStatus:
    getElement("dm-search-status"),

  searchResults:
    getElement("dm-search-results"),

  conversationList:
    getElement(
      "dm-conversation-list"
    ),

  conversationEmpty:
    getElement(
      "dm-conversation-empty"
    ),

  chatEmpty:
    getElement("dm-chat-empty"),

  chatActive:
    getElement("dm-chat-active"),

  mobileBackButton:
    getElement(
      "dm-mobile-back-button"
    ),

  activeAvatar:
    getElement("dm-active-avatar"),

  activeName:
    getElement("dm-active-name"),

  activeUsername:
    getElement("dm-active-username"),

  activePresence:
    getElement("dm-active-presence"),

  loadOlderButton:
    getElement(
      "dm-load-older-button"
    ),

  messageList:
    getElement("dm-message-list"),

  typingIndicator:
    getElement(
      "dm-typing-indicator"
    ),

  composer:
    getElement("dm-composer"),

  messageInput:
    getElement("dm-message-input"),

  sendButton:
    getElement("dm-send-button"),

  pageStatus:
    getElement("dm-page-status"),
};