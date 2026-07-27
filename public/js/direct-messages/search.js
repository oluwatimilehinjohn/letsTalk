import {
  dom,
} from "./dom.js";

import {
  searchUsers,
  openConversation,
} from "./api.js";

import {
  activateConversation,
  upsertConversation,
  setPageStatus,
} from "./conversations.js";

let searchTimer = null;
let searchRequestId = 0;
let openingUserId = null;

function getInitials(user) {
  const source =
    user?.displayName ||
    user?.username ||
    "?";

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      return part[0];
    })
    .join("")
    .toUpperCase();
}

function createSearchAvatar(
  user
) {
  const avatar =
    document.createElement("div");

  avatar.className =
    "dm-search-avatar";

  if (user?.avatarUrl) {
    const image =
      document.createElement("img");

    image.src =
      user.avatarUrl;

    image.alt =
      user.displayName ||
      user.username ||
      "User";

    image.addEventListener(
      "error",
      () => {
        image.remove();

        avatar.textContent =
          getInitials(user);
      },
      {
        once: true,
      }
    );

    avatar.appendChild(image);
  } else {
    avatar.textContent =
      getInitials(user);
  }

  return avatar;
}

function createSearchResult(
  user
) {
  const button =
    document.createElement("button");

  button.type = "button";

  button.className =
    "dm-search-result";

  button.dataset.userId =
    String(user.id || "");

  const content =
    document.createElement("div");

  content.className =
    "dm-search-result-content";

  const name =
    document.createElement("strong");

  name.textContent =
    user.displayName ||
    user.username ||
    "User";

  const username =
    document.createElement("span");

  username.textContent =
    user.username
      ? `@${user.username}`
      : "";

  content.append(
    name,
    username
  );

  button.append(
    createSearchAvatar(user),
    content
  );

  return button;
}

function renderSearchResults(
  users
) {
  dom.searchResults.replaceChildren();

  if (!users.length) {
    dom.searchStatus.textContent =
      "No matching users found.";

    return;
  }

  dom.searchStatus.textContent =
    `${users.length} user${
      users.length === 1
        ? ""
        : "s"
    } found.`;

  users.forEach((user) => {
    if (!user?.id) {
      return;
    }

    dom.searchResults.appendChild(
      createSearchResult(user)
    );
  });
}

function focusSearchPanel() {
  dom.searchPanel.hidden =
    false;

  window.requestAnimationFrame(
    () => {
      dom.userSearch.focus();
    }
  );
}

function clearSearch() {
  searchRequestId += 1;

  window.clearTimeout(
    searchTimer
  );

  dom.searchPanel.hidden =
    false;

  dom.userSearch.value =
    "";

  dom.searchResults.replaceChildren();

  dom.searchStatus.textContent =
    "Enter at least two characters.";

  dom.userSearch.focus();
}

async function performSearch() {
  const query =
    dom.userSearch.value.trim();

  const requestId =
    ++searchRequestId;

  if (query.length < 2) {
    dom.searchResults.replaceChildren();

    dom.searchStatus.textContent =
      "Enter at least two characters.";

    return;
  }

  dom.searchStatus.textContent =
    "Searching...";

  try {
    const result =
      await searchUsers(query);

    if (
      requestId !==
      searchRequestId
    ) {
      return;
    }

    renderSearchResults(
      Array.isArray(
        result.users
      )
        ? result.users
        : []
    );
  } catch (error) {
    if (
      requestId !==
      searchRequestId
    ) {
      return;
    }

    console.error(
      "Direct-message search failed:",
      error
    );

    dom.searchResults.replaceChildren();

    dom.searchStatus.textContent =
      error.message ||
      "Unable to search users.";
  }
}

async function handleSearchResult(
  button
) {
  const userId =
    String(
      button.dataset.userId ||
      ""
    ).trim();

  if (
    !userId ||
    openingUserId
  ) {
    return;
  }

  openingUserId =
    userId;

  const originalContent =
    button.innerHTML;

  button.disabled =
    true;

  button.innerHTML = `
    <i class="fas fa-spinner fa-spin"></i>

    <div class="dm-search-result-content">
      <strong>Opening conversation...</strong>
    </div>
  `;

  dom.searchStatus.textContent =
    "Opening conversation...";

  setPageStatus("");

  try {
    const result =
      await openConversation(
        userId
      );

    const conversation =
      result?.conversation;

    const conversationId =
      String(
        conversation?.id ||
        conversation?._id ||
        ""
      ).trim();

    if (!conversationId) {
      throw new Error(
        "The server did not return a conversation ID."
      );
    }

    upsertConversation(
      conversation
    );

    /*
     * Preserve the search field and the current
     * search results while opening the chat.
     */
    dom.searchPanel.hidden =
      false;

    dom.searchStatus.textContent =
      `Conversation opened with ${
        conversation.otherUser
          ?.displayName ||
        conversation.otherUser
          ?.username ||
        "user"
      }.`;

    button.disabled =
      false;

    button.innerHTML =
      originalContent;

    await activateConversation(
      conversationId,
      {
        updateUrl: true,
      }
    );
  } catch (error) {
    console.error(
      "Open conversation failed:",
      error
    );

    dom.searchStatus.textContent =
      error.message ||
      "Unable to open the conversation.";

    setPageStatus(
      error.message ||
      "Unable to open the conversation.",
      "error"
    );

    button.disabled =
      false;

    button.innerHTML =
      originalContent;
  } finally {
    openingUserId =
      null;
  }
}

export function bindSearch() {
  /*
   * The search panel is permanently visible.
   * These buttons now focus the search field.
   */
  dom.newConversationButton
    .addEventListener(
      "click",
      focusSearchPanel
    );

  dom.emptyNewButton
    .addEventListener(
      "click",
      focusSearchPanel
    );

  /*
   * The X button clears the search instead of
   * hiding the sidebar search panel.
   */
  dom.closeSearchButton
    .addEventListener(
      "click",
      clearSearch
    );

  dom.userSearch.addEventListener(
    "input",
    () => {
      window.clearTimeout(
        searchTimer
      );

      searchTimer =
        window.setTimeout(
          performSearch,
          300
        );
    }
  );

  dom.userSearch.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
        "Escape"
      ) {
        event.preventDefault();

        clearSearch();
      }
    }
  );

  dom.searchResults.addEventListener(
    "click",
    async (event) => {
      const button =
        event.target.closest(
          "button[data-user-id]"
        );

      if (
        !button ||
        !dom.searchResults.contains(
          button
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      await handleSearchResult(
        button
      );
    }
  );
}