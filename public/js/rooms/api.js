async function readResponse(
  response
) {
  let result = {};

  try {
    result =
      await response.json();
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
  const response =
    await fetch(
      "/api/auth/me"
    );

  if (
    response.status === 401
  ) {
    return null;
  }

  return readResponse(
    response
  );
}

export async function fetchRooms() {
  const response =
    await fetch(
      "/api/rooms"
    );

  return readResponse(
    response
  );
}

export async function createRoom(
  room
) {
  const response =
    await fetch(
      "/api/rooms",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            room
          ),
      }
    );

  return readResponse(
    response
  );
}

export async function joinRoom(
  identifier
) {
  const response =
    await fetch(
      `/api/rooms/${encodeURIComponent(
        identifier
      )}/join`,
      {
        method:
          "POST",
      }
    );

  return readResponse(
    response
  );
}

export async function joinRoomWithCode(
  inviteCode
) {
  const response =
    await fetch(
      "/api/rooms/join-with-code",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            inviteCode,
          }),
      }
    );

  return readResponse(
    response
  );
}

export async function regenerateInviteCode(
  identifier
) {
  const response =
    await fetch(
      `/api/rooms/${encodeURIComponent(
        identifier
      )}/invite-code`,
      {
        method:
          "POST",
      }
    );

  return readResponse(
    response
  );
}

export async function logoutUser() {
  const response =
    await fetch(
      "/api/auth/logout",
      {
        method:
          "POST",
      }
    );

  if (
    !response.ok &&
    response.status !== 401
  ) {
    return readResponse(
      response
    );
  }

  return null;
}