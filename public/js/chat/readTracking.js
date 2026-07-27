const MESSAGE_CONTAINER_SELECTORS = [
  "#chat-messages",
  ".chat-messages",
];

let roomIdentifier = "";
let firstUnreadMessageId = null;
let readTimer = null;
let observer = null;
let dividerInserted = false;

function getRoomIdentifier() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  return String(
    parameters.get("room") || ""
  ).trim();
}

function getMessageContainer() {
  for (
    const selector
    of MESSAGE_CONTAINER_SELECTORS
  ) {
    const container =
      document.querySelector(
        selector
      );

    if (container) {
      return container;
    }
  }

  return null;
}

function getMessageId(element) {
  if (
    !(element instanceof Element)
  ) {
    return "";
  }

  if (
    element.dataset.messageId
  ) {
    return element.dataset.messageId;
  }

  if (element.dataset.id) {
    return element.dataset.id;
  }

  if (
    element.id?.startsWith(
      "message-"
    )
  ) {
    return element.id.slice(
      "message-".length
    );
  }

  return "";
}

function findMessageElement(
  messageId
) {
  if (!messageId) {
    return null;
  }

  const container =
    getMessageContainer();

  if (!container) {
    return null;
  }

  const candidates =
    container.querySelectorAll(
      "[data-message-id], [data-id], [id^='message-']"
    );

  return (
    Array.from(candidates).find(
      (element) => {
        return (
          getMessageId(element) ===
          messageId
        );
      }
    ) || null
  );
}

function insertUnreadDivider() {
  if (
    dividerInserted ||
    !firstUnreadMessageId
  ) {
    return;
  }

  const messageElement =
    findMessageElement(
      firstUnreadMessageId
    );

  if (!messageElement) {
    return;
  }

  const divider =
    document.createElement("div");

  divider.className =
    "new-message-divider";

  divider.innerHTML =
    "<span>New messages</span>";

  messageElement.parentNode.insertBefore(
    divider,
    messageElement
  );

  dividerInserted = true;
}

async function fetchUnreadState(
  attempt = 0
) {
  try {
    const response = await fetch(
      `/api/rooms/${encodeURIComponent(
        roomIdentifier
      )}/unread`
    );

    if (
      response.status === 403 &&
      attempt < 3
    ) {
      window.setTimeout(
        () => {
          fetchUnreadState(
            attempt + 1
          );
        },
        700
      );

      return;
    }

    const result =
      await response.json();

    if (!response.ok) {
      return;
    }

    firstUnreadMessageId =
      result.firstUnreadMessageId ||
      null;

    insertUnreadDivider();
  } catch (error) {
    console.error(
      "Unable to load read state:",
      error
    );
  }
}

async function markRoomRead() {
  if (
    !roomIdentifier ||
    document.hidden ||
    !document.hasFocus()
  ) {
    return;
  }

  try {
    await fetch(
      `/api/rooms/${encodeURIComponent(
        roomIdentifier
      )}/read`,
      {
        method: "POST",
      }
    );
  } catch (error) {
    console.error(
      "Unable to mark room as read:",
      error
    );
  }
}

function scheduleMarkRead() {
  window.clearTimeout(
    readTimer
  );

  readTimer =
    window.setTimeout(
      markRoomRead,
      600
    );
}

function observeMessages() {
  const container =
    getMessageContainer();

  if (!container) {
    window.setTimeout(
      observeMessages,
      250
    );

    return;
  }

  observer =
    new MutationObserver(
      (mutations) => {
        const hasAddedContent =
          mutations.some(
            (mutation) => {
              return (
                mutation.addedNodes
                  .length > 0
              );
            }
          );

        if (!hasAddedContent) {
          return;
        }

        insertUnreadDivider();
        scheduleMarkRead();
      }
    );

  observer.observe(
    container,
    {
      childList: true,
      subtree: true,
    }
  );

  insertUnreadDivider();
  scheduleMarkRead();
}

function handleVisibilityChange() {
  if (!document.hidden) {
    scheduleMarkRead();
  }
}

export function startReadTracking() {
  roomIdentifier =
    getRoomIdentifier();

  if (!roomIdentifier) {
    return;
  }

  fetchUnreadState();
  observeMessages();

  window.addEventListener(
    "focus",
    scheduleMarkRead
  );

  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
  );
}