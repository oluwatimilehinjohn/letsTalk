const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomName = document.getElementById("room-name");
const userList = document.getElementById("users");

// Get username and room from the URL
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

/*
 * Join again whenever Socket.IO connects or reconnects.
 */
socket.on("connect", () => {
  socket.emit("joinRoom", {
    username,
    room,
  });
});

/*
 * Receive room and active-user information.
 */
socket.on("roomUsers", ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

/*
 * Load stored messages when entering the room.
 */
socket.on("messageHistory", (messages) => {
  chatMessages.innerHTML = "";

  messages.forEach((message) => {
    outputMessage(message);
  });

  scrollToLatestMessage();
});

/*
 * Receive one new live message.
 */
socket.on("message", (message) => {
  outputMessage(message);
  scrollToLatestMessage();
});

/*
 * Send a message.
 */
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const messageInput = event.target.elements.msg;
  const message = messageInput.value.trim();

  if (!message) {
    return;
  }

  if (message.length > 1000) {
    alert("Messages cannot be longer than 1,000 characters.");
    return;
  }

  socket.emit("chatMessage", message);

  messageInput.value = "";
  messageInput.focus();
});

/*
 * Add one message to the page.
 */
function outputMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");

  if (message.id) {
    messageElement.dataset.messageId = message.id;
  }

  const metadata = document.createElement("p");
  metadata.classList.add("meta");

  const usernameText = document.createTextNode(
    message.username
  );

  const time = document.createElement("span");
  time.innerText = message.time;

  metadata.appendChild(usernameText);
  metadata.appendChild(time);

  const text = document.createElement("p");
  text.classList.add("text");
  text.innerText = message.text;

  messageElement.appendChild(metadata);
  messageElement.appendChild(text);

  chatMessages.appendChild(messageElement);
}

/*
 * Show the current room.
 */
function outputRoomName(currentRoom) {
  roomName.innerText = currentRoom;
}

/*
 * Show users currently connected to the room.
 */
function outputUsers(users) {
  userList.innerHTML = "";

  users.forEach((user) => {
    const listItem = document.createElement("li");
    listItem.innerText = user.username;
    userList.appendChild(listItem);
  });
}

/*
 * Scroll to the latest message.
 */
function scrollToLatestMessage() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/*
 * Confirm before leaving the room.
 */
document
  .getElementById("leave-btn")
  .addEventListener("click", () => {
    const shouldLeave = confirm(
      "Are you sure you want to leave the chatroom?"
    );

    if (shouldLeave) {
      window.location = "../index.html";
    }
  });