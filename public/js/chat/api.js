export async function fetchCurrentUser() {
  const response = await fetch(
    "/api/auth/me"
  );

  if (response.status === 401) {
    return null;
  }

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ||
      "Unable to load your account."
    );
  }

  return result.user;
}

export async function logoutUser() {
  await fetch(
    "/api/auth/logout",
    {
      method: "POST",
    }
  );
}