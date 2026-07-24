const crypto = require("crypto");

const Room = require(
  "../models/Rooms"
);

function normalizeInviteCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function generateInviteCode() {
  return crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();
}

function hashInviteCode(code) {
  const normalizedCode =
    normalizeInviteCode(code);

  return crypto
    .createHash("sha256")
    .update(normalizedCode)
    .digest("hex");
}

async function generateUniqueInviteCode() {
  for (
    let attempt = 0;
    attempt < 10;
    attempt += 1
  ) {
    const inviteCode =
      generateInviteCode();

    const inviteCodeHash =
      hashInviteCode(inviteCode);

    const existingRoom =
      await Room.exists({
        inviteCodeHash,
      });

    if (!existingRoom) {
      return {
        inviteCode,
        inviteCodeHash,
      };
    }
  }

  throw new Error(
    "Unable to generate a unique invite code."
  );
}

function verifyInviteCode(
  submittedCode,
  storedHash
) {
  if (
    !submittedCode ||
    !storedHash
  ) {
    return false;
  }

  const submittedHash =
    hashInviteCode(
      submittedCode
    );

  const submittedBuffer =
    Buffer.from(
      submittedHash,
      "hex"
    );

  const storedBuffer =
    Buffer.from(
      storedHash,
      "hex"
    );

  if (
    submittedBuffer.length !==
    storedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    submittedBuffer,
    storedBuffer
  );
}

module.exports = {
  generateInviteCode,
  generateUniqueInviteCode,
  hashInviteCode,
  normalizeInviteCode,
  verifyInviteCode,
};