async function readResponse(response) {
  let result = {};

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  try {
    if (
      contentType.includes(
        "application/json"
      )
    ) {
      result =
        await response.json();
    } else {
      const text =
        await response.text();

      result = {
        error:
          text ||
          "The server returned an invalid response.",
      };
    }
  } catch (error) {
    result = {
      error:
        "The server response could not be read.",
    };
  }

  if (!response.ok) {
    const requestError =
      new Error(
        result.error ||
        `Request failed with status ${response.status}.`
      );

    requestError.status =
      response.status;

    requestError.code =
      result.code || null;

    throw requestError;
  }

  return result;
}

export async function fetchCurrentUser() {
  const response =
    await fetch(
      "/api/auth/me",
      {
        credentials:
          "same-origin",
      }
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

export async function fetchConversations() {
  const response =
    await fetch(
      "/api/direct-messages/conversations",
      {
        credentials:
          "same-origin",
      }
    );

  return readResponse(
    response
  );
}

export async function fetchConversation(
  conversationId
) {
  const response =
    await fetch(
      `/api/direct-messages/conversations/${encodeURIComponent(
        conversationId
      )}`,
      {
        credentials:
          "same-origin",
      }
    );

  return readResponse(
    response
  );
}

export async function fetchConversationMessages({
  conversationId,
  cursor = null,
  limit = 50,
}) {
  const parameters =
    new URLSearchParams();

  parameters.set(
    "limit",
    String(limit)
  );

  if (cursor) {
    parameters.set(
      "cursor",
      cursor
    );
  }

  const response =
    await fetch(
      `/api/direct-messages/conversations/${encodeURIComponent(
        conversationId
      )}/messages?${parameters.toString()}`,
      {
        credentials:
          "same-origin",
      }
    );

  return readResponse(
    response
  );
}

export async function searchUsers(query) {
  const normalizedQuery =
    String(query || "")
      .trim();

  const response =
    await fetch(
      `/api/direct-messages/users?q=${encodeURIComponent(
        normalizedQuery
      )}`,
      {
        credentials:
          "same-origin",
      }
    );

  return readResponse(
    response
  );
}

export async function openConversation(
  userId
) {
  const normalizedUserId =
    String(userId || "")
      .trim();

  if (!normalizedUserId) {
    throw new Error(
      "A user ID is required."
    );
  }

  const response =
    await fetch(
      `/api/direct-messages/conversations/${encodeURIComponent(
        normalizedUserId
      )}`,
      {
        method:
          "POST",

        credentials:
          "same-origin",

        headers: {
          Accept:
            "application/json",
        },
      }
    );

  return readResponse(
    response
  );
}

export async function markConversationRead(
  conversationId
) {
  const response =
    await fetch(
      `/api/direct-messages/conversations/${encodeURIComponent(
        conversationId
      )}/read`,
      {
        method:
          "POST",

        credentials:
          "same-origin",

        headers: {
          Accept:
            "application/json",
        },
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

        credentials:
          "same-origin",
      }
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