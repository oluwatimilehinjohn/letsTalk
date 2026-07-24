const formatMessage = require(
  "../../utils/messages"
);

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

  const welcomedRooms =
    Array.isArray(
      session.welcomedRooms
    )
      ? session.welcomedRooms
      : [];

  if (welcomedRooms.includes(room)) {
    return;
  }

  socket.emit(
    "message",
    formatMessage(
      BOT_NAME,
      "Welcome to letsTalk!"
    )
  );

  session.welcomedRooms = [
    ...welcomedRooms,
    room,
  ].slice(-20);

  await saveSession(session);
}

module.exports = sendWelcomeOnce;