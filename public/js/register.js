const registerForm =
  document.getElementById("register-form");

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

registerForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    clearError();

    const username =
      registerForm.elements.username.value.trim();

    const email =
      registerForm.elements.email.value.trim();

    const password =
      registerForm.elements.password.value;

    const confirmPassword =
      registerForm.elements.confirmPassword.value;

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    submitButton.disabled = true;
    submitButton.innerText =
      "Creating account...";

    try {
      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username,
            email,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showError(
          result.error ||
            "Unable to create account."
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
      submitButton.innerText =
        "Create Account";
    }
  }
);