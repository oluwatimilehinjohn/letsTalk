const {
  BOT_NAME,
} = require("../../config/chat");

function saveSession(session) {
  return new Promise(
    (resolve, reject) => {
      session.save((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    }
  );
}

async function sendWelcomeOnce(
  socket,
  room
) {
  const session =
    socket.request.session;

  if (!session) {
    return;
  }

  const roomId =
    String(
      room.id ||
      room._id ||
      ""
    );

  if (!roomId) {
    return;
  }

  if (
    !Array.isArray(
      session.welcomedRooms
    )
  ) {
    session.welcomedRooms = [];
  }

  if (
    session.welcomedRooms.includes(
      roomId
    )
  ) {
    return;
  }

  session.welcomedRooms.push(
    roomId
  );

  try {
    await saveSession(session);
  } catch (error) {
    console.error(
      "Unable to save welcome state:",
      error
    );
  }

  const now =
    new Date().toISOString();

  socket.emit("message", {
    id:
      `welcome-${roomId}-${Date.now()}`,

    _id:
      `welcome-${roomId}-${Date.now()}`,

    roomId,

    room:
      room.name,

    roomName:
      room.name,

    roomSlug:
      room.slug,

    text:
      `Welcome to ${room.name}!`,

    user: null,

    userId: null,

    username:
      BOT_NAME,

    displayName:
      BOT_NAME,

    avatarUrl: "",

    replyTo: null,

    reactions: [],

    isBot: true,

    isEdited: false,

    editedAt: null,

    createdAt: now,

    updatedAt: now,
  });
}

module.exports = sendWelcomeOnce;