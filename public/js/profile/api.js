async function readResult(response) {
  if (response.status === 204) {
    return null;
  }

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ||
      "The request failed."
    );
  }

  return result;
}

export async function fetchProfile() {
  const response = await fetch(
    "/api/profile"
  );

  if (response.status === 401) {
    return null;
  }

  return readResult(response);
}

export async function updateProfile(
  profile
) {
  const response = await fetch(
    "/api/profile",
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(profile),
    }
  );

  return readResult(response);
}

export async function uploadAvatar(
  avatarBlob
) {
  const formData =
    new FormData();

  formData.append(
    "avatar",
    avatarBlob,
    "avatar.jpg"
  );

  const response = await fetch(
    "/api/profile/avatar",
    {
      method: "POST",
      body: formData,
    }
  );

  return readResult(response);
}

export async function removeAvatar() {
  const response = await fetch(
    "/api/profile/avatar",
    {
      method: "DELETE",
    }
  );

  return readResult(response);
}

export async function changePassword(
  passwords
) {
  const response = await fetch(
    "/api/profile/password",
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        passwords
      ),
    }
  );

  return readResult(response);
}

export async function logoutUser() {
  await fetch(
    "/api/auth/logout",
    {
      method: "POST",
    }
  );
}