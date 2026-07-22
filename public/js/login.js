const loginForm =
  document.getElementById("login-form");

const errorElement =
  document.getElementById("form-error");

const submitButton =
  document.getElementById("submit-btn");

function showError(message) {
  errorElement.innerText = message;
  errorElement.style.display = "block";
}

function clearError() {
  errorElement.innerText = "";
  errorElement.style.display = "none";
}

async function redirectLoggedInUser() {
  try {
    const response = await fetch(
      "/api/auth/me"
    );

    if (response.ok) {
      window.location.replace("/rooms");
    }
  } catch (error) {
    console.error(error);
  }
}

loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    clearError();

    const identifier =
      loginForm.elements.identifier.value.trim();

    const password =
      loginForm.elements.password.value;

    submitButton.disabled = true;
    submitButton.innerText = "Logging in...";

    try {
      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            identifier,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showError(
          result.error ||
            "Unable to log in."
        );

        return;
      }

      window.location.replace("/rooms");
    } catch (error) {
      console.error(error);

      showError(
        "Unable to connect to the server."
      );
    } finally {
      submitButton.disabled = false;
      submitButton.innerText = "Log In";
    }
  }
);

redirectLoggedInUser();