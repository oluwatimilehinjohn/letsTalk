const chatForm = document.getElementById("chat-form");

const chatMessages = document.querySelector(".chat-messages");

const roomName = document.getElementById("room-name");

const userList = document.getElementById("users");

const currentUserElement = document.getElementById("current-user");

const logoutButton = document.getElementById("logout-btn");

const leaveButton = document.getElementById("leave-btn");

const membersToggle = document.getElementById("members-toggle");

const sidebarBackdrop = document.getElementById("sidebar-backdrop");

const params = new URLSearchParams(window.location.search);

const room = params.get("room");

let currentUser = null;

if (!room) {
  window.location.replace("/rooms");
}

const socket = io({
  autoConnect: false,
});

async function loadCurrentUser() {
  try {
    const response = await fetch("/api/auth/me");

    if (!response.ok) {
      window.location.replace("/");
      return;
    }

    const result = await response.json();

    currentUser = result.user;

    currentUserElement.innerText =
      currentUser.displayName || currentUser.username;

    socket.connect();
  } catch (error) {
    console.error(error);
    window.location.replace("/");
  }
}

socket.on("connect", () => {
  socket.emit("joinRoom", {
    room,
  });
});

socket.on("connect_error", (error) => {
  console.error(error);

  if (error.message === "UNAUTHORIZED") {
    window.location.replace("/");
  }
});

socket.on("joinError", (message) => {
  alert(message);
  window.location.replace("/rooms");
});

socket.on("roomUsers", ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

socket.on("messageHistory", (messages) => {
  chatMessages.innerHTML = "";

  messages.forEach((message) => {
    outputMessage(message);
  });

  scrollToLatestMessage();
});

socket.on("message", (message) => {
  outputMessage(message);
  scrollToLatestMessage();
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const messageInput = event.target.elements.msg;

  const message = messageInput.value.trim();

  if (!message) {
    return;
  }

  if (message.length > 1000) {
    alert("Messages cannot exceed 1,000 characters.");

    return;
  }

  socket.emit("chatMessage", message);

  messageInput.value = "";
  messageInput.focus();
});

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getProfileHref(username) {
  const normalizedUsername = String(username || "")
    .trim()
    .toLowerCase();

  const currentUsername = currentUser?.username?.trim().toLowerCase();

  if (currentUsername && normalizedUsername === currentUsername) {
    return "/profile";
  }

  return `/users/${encodeURIComponent(username)}`;
}

function createAvatar({ displayName, avatarUrl, username }) {
  const avatarLink = document.createElement("a");

  avatarLink.classList.add("message-avatar");

  avatarLink.href = getProfileHref(username);

  if (avatarUrl) {
    const image = document.createElement("img");

    image.src = avatarUrl;
    image.alt = `${displayName}'s avatar`;

    avatarLink.appendChild(image);
  } else {
    const fallback = document.createElement("span");

    fallback.innerText = getInitials(displayName);

    avatarLink.appendChild(fallback);
  }

  return avatarLink;
}

function outputMessage(message) {
  const isSystemMessage = !message.userId;

  const isOwnMessage = Boolean(
    currentUser && message.userId === currentUser.id,
  );

  const messageRow = document.createElement("div");

  messageRow.classList.add("message-row");

  if (isOwnMessage) {
    messageRow.classList.add("message-row-own");
  }

  if (isSystemMessage) {
    messageRow.classList.add("message-row-system");
  }

  const messageElement = document.createElement("div");

  messageElement.classList.add("message");

  if (isOwnMessage) {
    messageElement.classList.add("message-own");
  }

  if (isSystemMessage) {
    messageElement.classList.add("message-system");
  }

  if (message.id) {
    messageElement.dataset.messageId = message.id;
  }

  const metadata = document.createElement("p");

  metadata.classList.add("meta");

  const authorName = message.displayName || message.username;

  if (message.userId) {
    const authorLink = document.createElement("a");

    authorLink.href = getProfileHref(message.username);

    authorLink.innerText = isOwnMessage ? `${authorName} · You` : authorName;

    metadata.appendChild(authorLink);
  } else {
    const authorText = document.createElement("span");

    authorText.innerText = authorName;

    metadata.appendChild(authorText);
  }

  const time = document.createElement("span");

  time.innerText = message.time;

  metadata.appendChild(time);

  const text = document.createElement("p");

  text.classList.add("text");
  text.innerText = message.text;

  messageElement.appendChild(metadata);
  messageElement.appendChild(text);

  if (message.userId && !isOwnMessage) {
    messageRow.appendChild(
      createAvatar({
        displayName: authorName,
        avatarUrl: message.avatarUrl,
        username: message.username,
      }),
    );
  }

  messageRow.appendChild(messageElement);

  if (message.userId && isOwnMessage) {
    messageRow.appendChild(
      createAvatar({
        displayName: authorName,
        avatarUrl: message.avatarUrl,
        username: message.username,
      }),
    );
  }

  chatMessages.appendChild(messageRow);
}

function outputRoomName(currentRoom) {
  roomName.innerText = currentRoom;
}

function outputUsers(users) {
  userList.innerHTML = "";

  users.forEach((user) => {
    const listItem = document.createElement("li");

    const link = document.createElement("a");

    link.classList.add("room-user");

    link.href =
  getProfileHref(
    user.username
  );

    const avatar = document.createElement("span");

    avatar.classList.add("room-user-avatar");

    if (user.avatarUrl) {
      const image = document.createElement("img");

      image.src = user.avatarUrl;
      image.alt = "";

      avatar.appendChild(image);
    } else {
      avatar.innerText = getInitials(user.displayName || user.username);
    }

    const details = document.createElement("span");

    details.classList.add("room-user-details");

    const name = document.createElement("strong");

    name.innerText = user.displayName || user.username;

    const username = document.createElement("small");

    username.innerText = `@${user.username}`;

    details.appendChild(name);
    details.appendChild(username);

    link.appendChild(avatar);
    link.appendChild(details);

    listItem.appendChild(link);
    userList.appendChild(listItem);
  });
}

function scrollToLatestMessage() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

leaveButton.addEventListener("click", () => {
  const shouldLeave = confirm("Are you sure you want to leave this room?");

  if (shouldLeave) {
    window.location.href = "/rooms";
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
  } finally {
    socket.disconnect();
    window.location.replace("/");
  }
});

function openMembersPanel() {
  document.body.classList.add(
    "sidebar-open"
  );

  membersToggle?.setAttribute(
    "aria-expanded",
    "true"
  );
}

function closeMembersPanel() {
  document.body.classList.remove(
    "sidebar-open"
  );

  membersToggle?.setAttribute(
    "aria-expanded",
    "false"
  );
}

membersToggle?.addEventListener(
  "click",
  () => {
    const isOpen =
      document.body.classList.contains(
        "sidebar-open"
      );

    if (isOpen) {
      closeMembersPanel();
    } else {
      openMembersPanel();
    }
  }
);

sidebarBackdrop?.addEventListener(
  "click",
  closeMembersPanel
);

userList.addEventListener(
  "click",
  (event) => {
    if (event.target.closest("a")) {
      closeMembersPanel();
    }
  }
);

window.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape") {
      closeMembersPanel();
    }
  }
);

window.addEventListener(
  "resize",
  () => {
    if (window.innerWidth > 900) {
      closeMembersPanel();
    }
  }
);

loadCurrentUser();
