import { dom } from "./dom.js";

import {
  getInitials,
  getProfileHref,
} from "./utils.js";

function createUserAvatar(user) {
  const avatar =
    document.createElement("span");

  avatar.classList.add(
    "room-user-avatar"
  );

  if (user.avatarUrl) {
    const image =
      document.createElement("img");

    image.src = user.avatarUrl;
    image.alt = "";

    avatar.appendChild(image);

    return avatar;
  }

  avatar.innerText =
    getInitials(
      user.displayName ||
      user.username
    );

  return avatar;
}

function createUserDetails(user) {
  const details =
    document.createElement("span");

  details.classList.add(
    "room-user-details"
  );

  const name =
    document.createElement("strong");

  name.innerText =
    user.displayName ||
    user.username;

  const username =
    document.createElement("small");

  username.innerText =
    `@${user.username}`;

  details.appendChild(name);
  details.appendChild(username);

  return details;
}

function createUserItem(user) {
  const listItem =
    document.createElement("li");

  const link =
    document.createElement("a");

  link.classList.add("room-user");

  link.href =
    getProfileHref(
      user.username
    );

  link.appendChild(
    createUserAvatar(user)
  );

  link.appendChild(
    createUserDetails(user)
  );

  listItem.appendChild(link);

  return listItem;
}

export function outputRoomName(room) {
  dom.roomName.innerText = room;
}

export function outputUsers(
  users = []
) {
  dom.userList.innerHTML = "";

  users.forEach((user) => {
    dom.userList.appendChild(
      createUserItem(user)
    );
  });
}