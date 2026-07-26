import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  transferOwnership,
} from "./api.js";

function setPageStatus(
  message,
  type = ""
) {
  dom.pageStatus.innerText =
    message;

  dom.pageStatus.dataset.type =
    type;
}

export function renderOwnershipPermissions() {
  dom.ownershipSection.hidden =
    state.room?.role !== "owner";
}

export function renderOwnershipCandidates(
  members
) {
  dom.ownershipSelect.innerHTML =
    '<option value="">Select a member</option>';

  if (
    state.room?.role !== "owner"
  ) {
    return;
  }

  members
    .filter((member) => {
      return (
        member.role !== "owner"
      );
    })
    .forEach((member) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        member.userId;

      option.innerText =
        `${member.displayName} (@${member.username})`;

      dom.ownershipSelect.appendChild(
        option
      );
    });
}

async function handleTransferOwnership(
  event
) {
  event.preventDefault();

  const userId =
    dom.ownershipSelect.value;

  if (!userId) {
    setPageStatus(
      "Select a member to receive ownership.",
      "error"
    );

    return;
  }

  const selectedOption =
    dom.ownershipSelect.options[
      dom.ownershipSelect.selectedIndex
    ];

  const confirmed =
    window.confirm(
      `Transfer ownership to ${selectedOption.text}? You will become an admin.`
    );

  if (!confirmed) {
    return;
  }

  dom.transferOwnershipButton.disabled =
    true;

  dom.transferOwnershipButton.innerText =
    "Transferring...";

  try {
    await transferOwnership(
      state.identifier,
      userId
    );

    window.location.reload();
  } catch (error) {
    setPageStatus(
      error.message,
      "error"
    );

    dom.transferOwnershipButton.disabled =
      false;

    dom.transferOwnershipButton.innerHTML =
      '<i class="fas fa-exchange-alt"></i><span>Transfer ownership</span>';
  }
}

export function bindOwnership() {
  dom.ownershipForm.addEventListener(
    "submit",
    handleTransferOwnership
  );
}