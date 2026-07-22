const User = require("../models/User");

async function socketAuth(socket, next) {
  try {
    const currentSession =
      socket.request.session;

    if (!currentSession?.userId) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    const user = await User.findById(
      currentSession.userId
    ).lean();

    if (!user) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    socket.data.authenticatedUser = {
      id: user._id.toString(),
      username: user.username,

      displayName:
        user.displayName ||
        user.username,

      avatarUrl:
        user.avatarUrl || null,
    };

    next();
  } catch (error) {
    console.error(
      "Socket authentication error:",
      error
    );

    next(new Error("UNAUTHORIZED"));
  }
}

module.exports = socketAuth;