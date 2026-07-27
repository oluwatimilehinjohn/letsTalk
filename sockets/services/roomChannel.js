function getRoomChannel(roomId) {
  const normalizedRoomId =
    String(roomId || "").trim();

  if (!normalizedRoomId) {
    throw new Error(
      "A room ID is required."
    );
  }

  return `room:${normalizedRoomId}`;
}

module.exports = {
  getRoomChannel,
};