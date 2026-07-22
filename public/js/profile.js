const avatarImage =
  document.getElementById(
    "avatar-image"
  );

const avatarFallback =
  document.getElementById(
    "avatar-fallback"
  );

const profileHeading =
  document.getElementById(
    "profile-heading"
  );

const profileUsername =
  document.getElementById(
    "profile-username"
  );

const avatarForm =
  document.getElementById(
    "avatar-form"
  );

const avatarInput =
  document.getElementById(
    "avatar-input"
  );

const filePickerText =
  document.getElementById(
    "file-picker-text"
  );

const removeAvatarButton =
  document.getElementById(
    "remove-avatar-btn"
  );

const profileForm =
  document.getElementById(
    "profile-form"
  );

const passwordForm =
  document.getElementById(
    "password-form"
  );

const bioInput =
  document.getElementById("bio");

const bioCounter =
  document.getElementById(
    "bio-counter"
  );

const logoutButton =
  document.getElementById(
    "logout-btn"
  );

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function updateAvatar(user) {
  if (user.avatarUrl) {
    avatarImage.src = user.avatarUrl;
    avatarImage.hidden = false;
    avatarFallback.hidden = true;
  } else {
    avatarImage.hidden = true;
    avatarFallback.hidden = false;

    avatarFallback.innerText =
      getInitials(
        user.displayName ||
          user.username
      );
  }

  removeAvatarButton.disabled =
    !user.avatarUrl;
}

function renderProfile(user) {
  const displayName =
    user.displayName ||
    user.username;

  profileHeading.innerText =
    displayName;

  profileUsername.innerText =
    `@${user.username}`;

  profileForm.elements.displayName.value =
    displayName;

  profileForm.elements.bio.value =
    user.bio || "";

  updateBioCounter();
  updateAvatar(user);
}

function setStatus(
  elementId,
  message,
  type = "success"
) {
  const element =
    document.getElementById(
      elementId
    );

  element.innerText = message;
  element.dataset.type = type;
}

function clearStatus(elementId) {
  setStatus(elementId, "", "");
}

function updateBioCounter() {
  bioCounter.innerText =
    `${bioInput.value.length}/160`;
}

async function loadProfile() {
  try {
    const response = await fetch(
      "/api/profile"
    );

    if (response.status === 401) {
      window.location.replace("/");
      return;
    }

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
          "Unable to load profile."
      );
    }

    renderProfile(result.user);
  } catch (error) {
    setStatus(
      "profile-status",
      error.message,
      "error"
    );
  }
}

avatarInput.addEventListener(
  "change",
  () => {
    const file =
      avatarInput.files[0];

    if (!file) {
      filePickerText.innerText =
        "Choose an image";

      return;
    }

    filePickerText.innerText =
      file.name;

    const previewUrl =
      URL.createObjectURL(file);

    avatarImage.src = previewUrl;
    avatarImage.hidden = false;
    avatarFallback.hidden = true;
  }
);

avatarForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    clearStatus("avatar-status");

    const file =
      avatarInput.files[0];

    if (!file) {
      setStatus(
        "avatar-status",
        "Select an image first.",
        "error"
      );

      return;
    }

    const submitButton =
      document.getElementById(
        "avatar-submit"
      );

    submitButton.disabled = true;
    submitButton.innerText =
      "Uploading...";

    try {
      const formData =
        new FormData();

      formData.append(
        "avatar",
        file
      );

      const response = await fetch(
        "/api/profile/avatar",
        {
          method: "POST",
          body: formData,
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Upload failed."
        );
      }

      renderProfile(result.user);

      avatarInput.value = "";

      filePickerText.innerText =
        "Choose an image";

      setStatus(
        "avatar-status",
        "Avatar updated."
      );
    } catch (error) {
      setStatus(
        "avatar-status",
        error.message,
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.innerText =
        "Upload avatar";
    }
  }
);

removeAvatarButton.addEventListener(
  "click",
  async () => {
    const confirmed = confirm(
      "Remove your profile image?"
    );

    if (!confirmed) {
      return;
    }

    removeAvatarButton.disabled = true;

    try {
      const response = await fetch(
        "/api/profile/avatar",
        {
          method: "DELETE",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to remove avatar."
        );
      }

      renderProfile(result.user);

      setStatus(
        "avatar-status",
        "Avatar removed."
      );
    } catch (error) {
      setStatus(
        "avatar-status",
        error.message,
        "error"
      );
    } finally {
      removeAvatarButton.disabled =
        false;
    }
  }
);

profileForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    clearStatus("profile-status");

    const submitButton =
      document.getElementById(
        "profile-submit"
      );

    submitButton.disabled = true;
    submitButton.innerText =
      "Saving...";

    try {
      const response = await fetch(
        "/api/profile",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            displayName:
              profileForm.elements
                .displayName.value,

            bio:
              profileForm.elements
                .bio.value,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update profile."
        );
      }

      renderProfile(result.user);

      setStatus(
        "profile-status",
        "Profile saved."
      );
    } catch (error) {
      setStatus(
        "profile-status",
        error.message,
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.innerText =
        "Save profile";
    }
  }
);

passwordForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    clearStatus("password-status");

    const submitButton =
      document.getElementById(
        "password-submit"
      );

    submitButton.disabled = true;
    submitButton.innerText =
      "Updating...";

    try {
      const response = await fetch(
        "/api/profile/password",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            currentPassword:
              passwordForm.elements
                .currentPassword.value,

            newPassword:
              passwordForm.elements
                .newPassword.value,
          }),
        }
      );

      if (!response.ok) {
        const result =
          await response.json();

        throw new Error(
          result.error ||
            "Unable to change password."
        );
      }

      passwordForm.reset();

      setStatus(
        "password-status",
        "Password changed."
      );
    } catch (error) {
      setStatus(
        "password-status",
        error.message,
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.innerText =
        "Change password";
    }
  }
);

bioInput.addEventListener(
  "input",
  updateBioCounter
);

logoutButton.addEventListener(
  "click",
  async () => {
    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
        }
      );
    } finally {
      window.location.replace("/");
    }
  }
);

loadProfile();