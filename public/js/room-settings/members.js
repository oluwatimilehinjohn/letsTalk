import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  fetchMembers,
  removeMember,
  updateMemberRole,
} from "./api.js";

import {
  renderOwnershipCandidates,
} from "./ownership.js";

function setPageStatus(
  message,
  type = ""
) {
  dom.pageStatus.innerText =
    message;

  dom.pageStatus.dataset.type =
    type;
}

function createAvatar(member) {
  const avatar =
    document.createElement("span");

  avatar.className =
    "managed-member-avatar";

  if (member.avatarUrl) {
    const image =
      document.createElement("img");

    image.src =
      member.avatarUrl;

    image.alt =
      member.displayName;

    avatar.appendChild(image);

    return avatar;
  }

  avatar.innerText =
    member.displayName
      .charAt(0)
      .toUpperCase();

  return avatar;
}

function createMemberInformation(
  member
) {
  const information =
    document.createElement("div");

  information.className =
    "managed-member-information";

  const name =
    document.createElement("strong");

  name.innerText =
    member.displayName;

  const username =
    document.createElement("span");

  username.innerText =
    `@${member.username}`;

  information.appendChild(name);
  information.appendChild(username);

  return information;
}

function createRoleBadge(member) {
  const badge =
    document.createElement("span");

  badge.className =
    `room-badge room-badge-${member.role}`;

  badge.innerText =
    member.role;

  return badge;
}

function createRoleSelect(member) {
  const select =
    document.createElement("select");

  select.className =
    "member-role-select";

  select.dataset.action =
    "change-role";

  select.dataset.userId =
    member.userId;

  const memberOption =
    document.createElement("option");

  memberOption.value =
    "member";

  memberOption.innerText =
    "Member";

  const adminOption =
    document.createElement("option");

  adminOption.value =
    "admin";

  adminOption.innerText =
    "Admin";

  select.appendChild(
    memberOption
  );

  select.appendChild(
    adminOption
  );

  select.value =
    member.role;

  return select;
}

function createRemoveButton(member) {
  const button =
    document.createElement("button");

  button.type = "button";

  button.className =
    "btn btn-danger managed-member-remove";

  button.dataset.action =
    "remove-member";

  button.dataset.userId =
    member.userId;

  button.dataset.displayName =
    member.displayName;

  button.innerHTML =
    '<i class="fas fa-user-minus"></i><span>Remove</span>';

  return button;
}

function createMemberActions(member) {
  const actions =
    document.createElement("div");

  actions.className =
    "managed-member-actions";

  const currentRole =
    state.room.role;

  if (
    member.role === "owner"
  ) {
    actions.appendChild(
      createRoleBadge(member)
    );

    return actions;
  }

  if (
    currentRole === "owner"
  ) {
    actions.appendChild(
      createRoleSelect(member)
    );

    actions.appendChild(
      createRemoveButton(member)
    );

    return actions;
  }

  if (
    currentRole === "admin" &&
    member.role === "member"
  ) {
    actions.appendChild(
      createRoleBadge(member)
    );

    actions.appendChild(
      createRemoveButton(member)
    );

    return actions;
  }

  actions.appendChild(
    createRoleBadge(member)
  );

  return actions;
}

function createMemberRow(member) {
  const row =
    document.createElement("article");

  row.className =
    "managed-member-row";

  const identity =
    document.createElement("div");

  identity.className =
    "managed-member-identity";

  identity.appendChild(
    createAvatar(member)
  );

  identity.appendChild(
    createMemberInformation(
      member
    )
  );

  row.appendChild(identity);

  row.appendChild(
    createMemberActions(member)
  );

  return row;
}

export function renderMembers() {
  dom.memberList.innerHTML = "";

  dom.memberCount.innerText =
    `${state.members.length} member${
      state.members.length === 1
        ? ""
        : "s"
    }`;

  state.members.forEach(
    (member) => {
      dom.memberList.appendChild(
        createMemberRow(member)
      );
    }
  );

  renderOwnershipCandidates(
    state.members
  );
}

export async function loadMembers() {
  try {
    const result =
      await fetchMembers(
        state.identifier
      );

    state.members =
      result.members || [];

    renderMembers();
  } catch (error) {
    setPageStatus(
      error.message,
      "error"
    );
  }
}

async function handleRoleChange(
  select
) {
  const previousRole =
    state.members.find(
      (member) => {
        return (
          member.userId ===
          select.dataset.userId
        );
      }
    )?.role;

  select.disabled = true;

  try {
    await updateMemberRole(
      state.identifier,
      select.dataset.userId,
      select.value
    );

    await loadMembers();

    setPageStatus(
      "Member role updated."
    );
  } catch (error) {
    select.value =
      previousRole || "member";

    select.disabled = false;

    setPageStatus(
      error.message,
      "error"
    );
  }
}

async function handleRemoveMember(
  button
) {
  const displayName =
    button.dataset.displayName;

  const confirmed =
    window.confirm(
      `Remove ${displayName} from this room?`
    );

  if (!confirmed) {
    return;
  }

  button.disabled = true;

  try {
    await removeMember(
      state.identifier,
      button.dataset.userId
    );

    await loadMembers();

    setPageStatus(
      `${displayName} was removed from the room.`
    );
  } catch (error) {
    button.disabled = false;

    setPageStatus(
      error.message,
      "error"
    );
  }
}

export function bindMembers() {
  dom.memberList.addEventListener(
    "change",
    (event) => {
      const select =
        event.target.closest(
          'select[data-action="change-role"]'
        );

      if (!select) {
        return;
      }

      handleRoleChange(select);
    }
  );

  dom.memberList.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          'button[data-action="remove-member"]'
        );

      if (!button) {
        return;
      }

      handleRemoveMember(button);
    }
  );
}