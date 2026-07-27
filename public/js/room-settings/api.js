async function readResponse(response) {
  let result = {};

  try {
    result = await response.json();
  } catch (error) {
    result = {};
  }

  if (!response.ok) {
    throw new Error(
      result.error ||
      "The request failed."
    );
  }

  return result;
}

export async function fetchCurrentUser() {
  const response = await fetch(
    "/api/auth/me"
  );

  if (response.status === 401) {
    return null;
  }

  return readResponse(response);
}

export async function fetchRoom(
  identifier
) {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(
      identifier
    )}`
  );

  return readResponse(response);
}

export async function updateRoom(
  identifier,
  updates
) {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(
      identifier
    )}`,
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(updates),
    }
  );

  return readResponse(response);
}

export async function fetchMembers(
  identifier
) {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(
      identifier
    )}/members`
  );

  return readResponse(response);
}

export async function updateMemberRole(
  identifier,
  userId,
  role
) {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(
      identifier
    )}/members/${encodeURIComponent(
      userId
    )}/role`,
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        role,
      }),
    }
  );

  return readResponse(response);
}

export async function removeMember(
  identifier,
  userId
) {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(
      identifier
    )}/members/${encodeURIComponent(
      userId
    )}`,
    {
      method: "DELETE",
    }
  );

  return readResponse(response);
}

export async function transferOwnership(
  identifier,
  userId
) {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(
      identifier
    )}/transfer-ownership`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        userId,
      }),
    }
  );

  return readResponse(response);
}

export async function generateInviteCode(
  identifier
) {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(
      identifier
    )}/invite-code`,
    {
      method: "POST",
    }
  );

  return readResponse(response);
}

export async function leaveRoom(
  identifier
) {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(
      identifier
    )}/leave`,
    {
      method: "POST",
    }
  );

  return readResponse(response);
}

export async function archiveRoom(
  identifier
) {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(
      identifier
    )}`,
    {
      method: "DELETE",
    }
  );

  return readResponse(response);
}

export async function logoutUser() {
  const response = await fetch(
    "/api/auth/logout",
    {
      method: "POST",
    }
  );

  if (
    !response.ok &&
    response.status !== 401
  ) {
    return readResponse(response);
  }

  return null;
}