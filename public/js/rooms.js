const roomForm =
  document.getElementById("room-form");

const currentUserElement =
  document.getElementById("current-user");

const logoutButton =
  document.getElementById("logout-btn");

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
  } catch (error) {
    console.error(error);
    window.location.replace("/");
  }
}

roomForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    const room =
      roomForm.elements.room.value;

    window.location.href =
      `/chat?room=${encodeURIComponent(room)}`;
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
      window.location.replace("/");
    }
  }
);

loadCurrentUser();