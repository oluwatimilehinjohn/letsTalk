const avatarImage =
  document.getElementById(
    "user-avatar"
  );

const avatarFallback =
  document.getElementById(
    "user-avatar-fallback"
  );

const onlineIndicator =
  document.getElementById(
    "online-indicator"
  );

const displayNameElement =
  document.getElementById(
    "user-display-name"
  );

const usernameElement =
  document.getElementById(
    "user-username"
  );

const statusElement =
  document.getElementById(
    "user-status"
  );

const bioElement =
  document.getElementById(
    "user-bio"
  );

const memberSinceElement =
  document.getElementById(
    "member-since"
  );

const lastActiveElement =
  document.getElementById(
    "last-active"
  );

const errorElement =
  document.getElementById(
    "profile-error"
  );

const backButton =
  document.getElementById(
    "back-btn"
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

function formatDate(dateValue) {
  if (!dateValue) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
    }
  ).format(new Date(dateValue));
}

function formatLastSeen(dateValue) {
  if (!dateValue) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(dateValue));
}

function renderUser(user) {
  const displayName =
    user.displayName ||
    user.username;

  displayNameElement.innerText =
    displayName;

  usernameElement.innerText =
    `@${user.username}`;

  bioElement.innerText =
    user.bio ||
    "This user has not added a bio yet.";

  memberSinceElement.innerText =
    formatDate(user.createdAt);

  if (user.online) {
    statusElement.innerText =
      "Online now";

    lastActiveElement.innerText =
      "Online now";

    onlineIndicator.classList.add(
      "is-online"
    );
  } else {
    statusElement.innerText =
      "Offline";

    lastActiveElement.innerText =
      formatLastSeen(
        user.lastSeenAt
      );

    onlineIndicator.classList.remove(
      "is-online"
    );
  }

  if (user.avatarUrl) {
    avatarImage.src = user.avatarUrl;
    avatarImage.hidden = false;
    avatarFallback.hidden = true;
  } else {
    avatarImage.hidden = true;
    avatarFallback.hidden = false;

    avatarFallback.innerText =
      getInitials(displayName);
  }

  document.title =
    `${displayName} | letsTalk`;
}

async function loadUser() {
  const username =
    decodeURIComponent(
      window.location.pathname
        .split("/")
        .filter(Boolean)
        .pop()
    );

  try {
    const response = await fetch(
      `/api/users/${encodeURIComponent(
        username
      )}`
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

    renderUser(result.user);
  } catch (error) {
    errorElement.innerText =
      error.message;

    displayNameElement.innerText =
      "Profile unavailable";
  }
}

backButton.addEventListener(
  "click",
  () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "/rooms";
  }
);

loadUser();