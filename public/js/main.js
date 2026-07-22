const chatForm =
  document.getElementById("chat-form");

const chatMessages =
  document.querySelector(".chat-messages");

const roomName =
  document.getElementById("room-name");

const userList =
  document.getElementById("users");

const currentUserElement =
  document.getElementById("current-user");

const logoutButton =
  document.getElementById("logout-btn");

const leaveButton =
  document.getElementById("leave-btn");

const params = new URLSearchParams(
  window.location.search
);

const room = params.get("room");

if (!room) {
  window.location.replace("/rooms");
}

const socket = io({
  autoConnect: false,
});

async function loadCurrentUser() {
  try {
    const response = await fetch(
      "/api/auth/me"
    );

    if (!response.ok) {
      window.location.replace("/");
      return;
    }

    const result = await response.json();

    currentUserElement.innerText =
      result.user.username;

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

socket.on(
  "roomUsers",
  ({ room, users }) => {
    outputRoomName(room);
    outputUsers(users);
  }
);

socket.on(
  "messageHistory",
  (messages) => {
    chatMessages.innerHTML = "";

    messages.forEach((message) => {
      outputMessage(message);
    });

    scrollToLatestMessage();
  }
);

socket.on("message", (message) => {
  outputMessage(message);
  scrollToLatestMessage();
});

chatForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    const messageInput =
      event.target.elements.msg;

    const message =
      messageInput.value.trim();

    if (!message) {
      return;
    }

    if (message.length > 1000) {
      alert(
        "Messages cannot exceed 1,000 characters."
      );

      return;
    }

    socket.emit(
      "chatMessage",
      message
    );

    messageInput.value = "";
    messageInput.focus();
  }
);

function outputMessage(message) {
  const messageElement =
    document.createElement("div");

  messageElement.classList.add("message");

  if (message.id) {
    messageElement.dataset.messageId =
      message.id;
  }

  const metadata =
    document.createElement("p");

  metadata.classList.add("meta");

  const usernameText =
    document.createTextNode(
      message.username
    );

  const time =
    document.createElement("span");

  time.innerText = message.time;

  metadata.appendChild(usernameText);
  metadata.appendChild(time);

  const text =
    document.createElement("p");

  text.classList.add("text");
  text.innerText = message.text;

  messageElement.appendChild(metadata);
  messageElement.appendChild(text);

  chatMessages.appendChild(
    messageElement
  );
}

function outputRoomName(currentRoom) {
  roomName.innerText = currentRoom;
}

function outputUsers(users) {
  userList.innerHTML = "";

  users.forEach((user) => {
    const listItem =
      document.createElement("li");

    listItem.innerText =
      user.username;

    userList.appendChild(listItem);
  });
}

function scrollToLatestMessage() {
  chatMessages.scrollTop =
    chatMessages.scrollHeight;
}

leaveButton.addEventListener(
  "click",
  () => {
    const shouldLeave = confirm(
      "Are you sure you want to leave this room?"
    );

    if (shouldLeave) {
      window.location.href = "/rooms";
    }
  }
);

logoutButton.addEventListener(
  "click",
  async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      socket.disconnect();
      window.location.replace("/");
    }
  }
);

loadCurrentUser();