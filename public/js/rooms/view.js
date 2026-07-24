import { dom } from "./dom.js";
import { state } from "./state.js";

function getVisibleRooms() {
  const query =
    state.searchQuery
      .trim()
      .toLowerCase();

  if (!query) {
    return state.rooms;
  }

  return state.rooms.filter(
    (room) => {
      const searchableText = [
        room.name,
        room.description,
        room.visibility,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        query
      );
    }
  );
}

function createBadge(
  text,
  className
) {
  const badge =
    document.createElement("span");

  badge.classList.add(
    "room-badge",
    className
  );

  badge.innerText = text;

  return badge;
}

function createRoomHeader(room) {
  const header =
    document.createElement("div");

  header.classList.add(
    "room-card-header"
  );

  const icon =
    document.createElement("span");

  icon.classList.add(
    "room-card-icon"
  );

  icon.innerHTML =
    room.visibility === "private"
      ? '<i class="fas fa-lock"></i>'
      : '<i class="fas fa-comments"></i>';

  const badges =
    document.createElement("div");

  badges.classList.add(
    "room-card-badges"
  );

  badges.appendChild(
    createBadge(
      room.visibility,
      room.visibility === "private"
        ? "room-badge-private"
        : "room-badge-public"
    )
  );

  if (room.isSystem) {
    badges.appendChild(
      createBadge(
        "Official",
        "room-badge-system"
      )
    );
  }

  if (room.role === "owner") {
    badges.appendChild(
      createBadge(
        "Owner",
        "room-badge-owner"
      )
    );
  }

  header.appendChild(icon);
  header.appendChild(badges);

  return header;
}

function createRoomInformation(room) {
  const content =
    document.createElement("div");

  content.classList.add(
    "room-card-content"
  );

  const title =
    document.createElement("h2");

  title.innerText = room.name;

  const description =
    document.createElement("p");

  description.innerText =
    room.description ||
    "No room description has been added.";

  content.appendChild(title);
  content.appendChild(description);

  return content;
}

function createActionButton({
  className,
  action,
  room,
  icon,
  label,
  disabled = false,
}) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.className = className;
  button.dataset.action = action;
  button.dataset.roomSlug =
    room.slug;
  button.dataset.roomName =
    room.name;
  button.disabled = disabled;

  button.innerHTML =
    `<i class="${icon}"></i>
    <span>${label}</span>`;

  return button;
}

function createRoomActions(room) {
  const actions =
    document.createElement("div");

  actions.classList.add(
    "room-card-actions"
  );

  if (room.isMember) {
    if (
      room.role === "owner" &&
      room.joinPolicy === "invite"
    ) {
      actions.appendChild(
        createActionButton({
          className:
            "btn btn-secondary room-icon-button",

          action: "manage-invite",

          room,

          icon: "fas fa-key",

          label: "Invite",
        })
      );
    }

    actions.appendChild(
      createActionButton({
        className: "btn",

        action: "enter",

        room,

        icon: "fas fa-arrow-right",

        label: "Enter",
      })
    );

    return actions;
  }

  if (
    room.visibility === "public" &&
    room.joinPolicy === "open"
  ) {
    actions.appendChild(
      createActionButton({
        className:
          "btn btn-secondary",

        action: "join",

        room,

        icon: "fas fa-sign-in-alt",

        label: "Join",
      })
    );

    return actions;
  }

  if (
    room.joinPolicy === "invite"
  ) {
    actions.appendChild(
      createActionButton({
        className:
          "btn btn-secondary",

        action: "join-invite",

        room,

        icon: "fas fa-key",

        label: "Use code",
      })
    );

    return actions;
  }

  actions.appendChild(
    createActionButton({
      className:
        "btn btn-secondary",

      action: "unavailable",

      room,

      icon: "fas fa-lock",

      label: "Unavailable",

      disabled: true,
    })
  );

  return actions;
}

function createRoomFooter(room) {
  const footer =
    document.createElement("div");

  footer.classList.add(
    "room-card-footer"
  );

  const members =
    document.createElement("span");

  members.classList.add(
    "room-member-count"
  );

  members.innerHTML =
    `<i class="fas fa-users"></i>
    ${room.memberCount}
    member${room.memberCount === 1 ? "" : "s"}`;

  footer.appendChild(members);

  footer.appendChild(
    createRoomActions(room)
  );

  return footer;
}

function createRoomCard(room) {
  const card =
    document.createElement("article");

  card.classList.add(
    "room-card"
  );

  if (room.isMember) {
    card.classList.add(
      "room-card-member"
    );
  }

  card.appendChild(
    createRoomHeader(room)
  );

  card.appendChild(
    createRoomInformation(room)
  );

  card.appendChild(
    createRoomFooter(room)
  );

  return card;
}

export function setDirectoryStatus(
  message,
  type = ""
) {
  dom.directoryStatus.innerText =
    message;

  dom.directoryStatus.dataset.type =
    type;
}

export function renderRooms() {
  const rooms = getVisibleRooms();

  dom.roomList.innerHTML = "";

  dom.emptyState.hidden =
    rooms.length > 0;

  rooms.forEach((room) => {
    dom.roomList.appendChild(
      createRoomCard(room)
    );
  });
}