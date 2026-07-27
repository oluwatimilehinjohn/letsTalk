import {
  dom,
} from "./dom.js";

import {
  state,
} from "./state.js";

import {
  fetchCurrentUser,
} from "./api.js";

import {
  initializeSocket,
} from "./socket.js";

import {
  activateConversation,
  bindConversationEvents,
  handleConversationActivity,
  handleDirectMessage,
  handleMessageRead,
  handlePresenceUpdated,
  handleSocketConnected,
  handleSocketDisconnected,
  handleSocketError,
  handleTypingStart,
  handleTypingStop,
  loadConversations,
  refreshPresence,
  setPageStatus,
} from "./conversations.js";

import {
  bindComposer,
} from "./composer.js";

import {
  bindSearch,
} from "./search.js";

import {
  bindNavigation,
} from "./navigation.js";

function normalizeCurrentUser(
  result
) {
  return (
    result?.user ||
    result?.currentUser ||
    result
  );
}

function getRequestedConversationId() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  return String(
    parameters.get(
      "conversation"
    ) || ""
  ).trim();
}

async function initializePage() {
  try {
    const authResult =
      await fetchCurrentUser();

    if (!authResult) {
      window.location.href =
        "/";

      return;
    }

    state.currentUser =
      normalizeCurrentUser(
        authResult
      );

    dom.currentUser.textContent =
      state.currentUser
        ?.displayName ||
      state.currentUser
        ?.username ||
      "";

    /*
     * Bind the interface before loading data.
     */
    bindConversationEvents();
    bindComposer();
    bindSearch();
    bindNavigation();

    initializeSocket({
      onConnect:
        handleSocketConnected,

      onDisconnect:
        handleSocketDisconnected,

      onConnectionError:
        handleSocketError,

      onDirectMessage:
        handleDirectMessage,

      onConversationActivity:
        handleConversationActivity,

      onMessageRead:
        handleMessageRead,

      onTypingStart:
        handleTypingStart,

      onTypingStop:
        handleTypingStop,

      onPresenceUpdated:
        handlePresenceUpdated,
    });

    await loadConversations();

    const requestedConversationId =
      getRequestedConversationId();

    if (requestedConversationId) {
      await activateConversation(
        requestedConversationId,
        {
          updateUrl: false,
        }
      );
    }

    await refreshPresence();
  } catch (error) {
    console.error(
      "Direct-message page initialization error:",
      error
    );

    setPageStatus(
      error.message ||
      "Unable to load direct messages.",
      "error"
    );
  }
}

initializePage();