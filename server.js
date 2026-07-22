require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const bcrypt = require("bcryptjs");
const {
  rateLimit,
} = require("express-rate-limit");

const connectDB = require("./config/db");
const User = require("./models/User");
const Message = require("./models/Message");
const formatMessage = require("./utils/messages");

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const publicDirectory = path.join(
  __dirname,
  "public"
);

const privateDirectory = path.join(
  __dirname,
  "private"
);

const botName = "letsTalk Bot";
const MESSAGE_HISTORY_LIMIT = 100;

const ALLOWED_ROOMS = new Set([
  "JavaScript",
  "Python",
  "PHP",
  "C#",
  "Ruby",
  "Java",
]);

const isProduction =
  process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET is missing from the .env file"
  );
}

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "10kb",
  })
);

const sessionMiddleware = session({
  name: "letstalk.sid",

  secret: process.env.SESSION_SECRET,

  resave: false,

  saveUninitialized: false,

  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 7 * 24 * 60 * 60,
    touchAfter: 24 * 60 * 60,
  }),

  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

app.use(sessionMiddleware);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 20,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    error:
      "Too many authentication attempts. Please try again later.",
  },
});

const USERNAME_PATTERN =
  /^[A-Za-z0-9_]{3,24}$/;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt,
  };
}

function regenerateSession(request) {
  return new Promise(
    (resolve, reject) => {
      request.session.regenerate(
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    }
  );
}

function saveSession(request) {
  return new Promise(
    (resolve, reject) => {
      request.session.save((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    }
  );
}

function destroySession(request) {
  return new Promise(
    (resolve, reject) => {
      request.session.destroy(
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    }
  );
}

function requireAuthPage(
  request,
  response,
  next
) {
  if (!request.session.userId) {
    response.redirect("/");
    return;
  }

  next();
}

function serializeMessage(message) {
  return formatMessage(
    message.username,
    message.text,
    message.createdAt,
    message._id.toString(),
    message.userId
      ? message.userId.toString()
      : null
  );
}

/*
 * Authentication API
 */

app.post(
  "/api/auth/register",
  authLimiter,
  async (request, response) => {
    try {
      const username =
        typeof request.body.username ===
        "string"
          ? request.body.username.trim()
          : "";

      const usernameLower =
        username.toLowerCase();

      const email =
        typeof request.body.email ===
        "string"
          ? request.body.email
              .trim()
              .toLowerCase()
          : "";

      const password =
        typeof request.body.password ===
        "string"
          ? request.body.password
          : "";

      if (
        !USERNAME_PATTERN.test(username)
      ) {
        response.status(400).json({
          error:
            "Username must contain 3–24 letters, numbers or underscores.",
        });

        return;
      }

      if (!EMAIL_PATTERN.test(email)) {
        response.status(400).json({
          error:
            "Enter a valid email address.",
        });

        return;
      }

      if (
        password.length < 8 ||
        password.length > 72
      ) {
        response.status(400).json({
          error:
            "Password must contain between 8 and 72 characters.",
        });

        return;
      }

      const existingUser =
        await User.findOne({
          $or: [
            {
              usernameLower,
            },
            {
              email,
            },
          ],
        }).lean();

      if (existingUser) {
        response.status(409).json({
          error:
            "That username or email is already registered.",
        });

        return;
      }

      const passwordHash =
        await bcrypt.hash(password, 12);

      const user = await User.create({
        username,
        usernameLower,
        email,
        passwordHash,
      });

      await regenerateSession(request);

      request.session.userId =
        user._id.toString();

      await saveSession(request);

      response.status(201).json({
        user: publicUser(user),
      });
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      if (error.code === 11000) {
        response.status(409).json({
          error:
            "That username or email is already registered.",
        });

        return;
      }

      response.status(500).json({
        error:
          "Unable to create your account.",
      });
    }
  }
);

app.post(
  "/api/auth/login",
  authLimiter,
  async (request, response) => {
    try {
      const identifier =
        typeof request.body.identifier ===
        "string"
          ? request.body.identifier
              .trim()
              .toLowerCase()
          : "";

      const password =
        typeof request.body.password ===
        "string"
          ? request.body.password
          : "";

      if (!identifier || !password) {
        response.status(400).json({
          error:
            "Email or username and password are required.",
        });

        return;
      }

      const user = await User.findOne({
        $or: [
          {
            email: identifier,
          },
          {
            usernameLower: identifier,
          },
        ],
      }).select("+passwordHash");

      if (!user) {
        response.status(401).json({
          error:
            "Invalid email, username or password.",
        });

        return;
      }

      const passwordMatches =
        await bcrypt.compare(
          password,
          user.passwordHash
        );

      if (!passwordMatches) {
        response.status(401).json({
          error:
            "Invalid email, username or password.",
        });

        return;
      }

      user.lastSeenAt = new Date();
      await user.save();

      await regenerateSession(request);

      request.session.userId =
        user._id.toString();

      await saveSession(request);

      response.json({
        user: publicUser(user),
      });
    } catch (error) {
      console.error("Login error:", error);

      response.status(500).json({
        error: "Unable to log in.",
      });
    }
  }
);

app.get(
  "/api/auth/me",
  async (request, response) => {
    try {
      if (!request.session.userId) {
        response.status(401).json({
          error: "Not authenticated.",
        });

        return;
      }

      const user = await User.findById(
        request.session.userId
      ).lean();

      if (!user) {
        await destroySession(request);

        response.status(401).json({
          error: "Account not found.",
        });

        return;
      }

      response.json({
        user: publicUser(user),
      });
    } catch (error) {
      console.error(
        "Current user error:",
        error
      );

      response.status(500).json({
        error:
          "Unable to load your account.",
      });
    }
  }
);

app.post(
  "/api/auth/logout",
  async (request, response) => {
    try {
      const sessionId =
        request.session.id;

      await destroySession(request);

      response.clearCookie(
        "letstalk.sid",
        {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          path: "/",
        }
      );

      io.in(sessionId).disconnectSockets();

      response.status(204).end();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      response.status(500).json({
        error: "Unable to log out.",
      });
    }
  }
);

/*
 * Page routes
 */

app.get("/", (request, response) => {
  if (request.session.userId) {
    response.redirect("/rooms");
    return;
  }

  response.sendFile(
    path.join(
      publicDirectory,
      "index.html"
    )
  );
});

app.get(
  "/rooms",
  requireAuthPage,
  (request, response) => {
    response.sendFile(
      path.join(
        privateDirectory,
        "rooms.html"
      )
    );
  }
);

app.get(
  "/chat",
  requireAuthPage,
  (request, response) => {
    response.sendFile(
      path.join(
        privateDirectory,
        "chat.html"
      )
    );
  }
);

app.use(
  express.static(publicDirectory)
);

/*
 * Share Express sessions with Socket.IO
 */

io.engine.use(sessionMiddleware);

io.use(async (socket, next) => {
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
    };

    next();
  } catch (error) {
    console.error(
      "Socket authentication error:",
      error
    );

    next(new Error("UNAUTHORIZED"));
  }
});

/*
 * Socket.IO chat
 */

io.on("connection", (socket) => {
  const sessionId =
    socket.request.session.id;

  socket.join(sessionId);

  socket.on(
    "joinRoom",
    async ({ room } = {}) => {
      try {
        const cleanRoom =
          typeof room === "string"
            ? room.trim()
            : "";

        if (
          !ALLOWED_ROOMS.has(cleanRoom)
        ) {
          socket.emit(
            "joinError",
            "That room does not exist."
          );

          return;
        }

        const authenticatedUser =
          socket.data.authenticatedUser;

        const previousUser =
          getCurrentUser(socket.id);

        if (
          previousUser &&
          previousUser.room !== cleanRoom
        ) {
          socket.leave(
            previousUser.room
          );

          userLeave(socket.id);

          io.to(
            previousUser.room
          ).emit("roomUsers", {
            room: previousUser.room,
            users: getRoomUsers(
              previousUser.room
            ),
          });
        }

        const user = userJoin(
          socket.id,
          authenticatedUser.id,
          authenticatedUser.username,
          cleanRoom
        );

        socket.join(user.room);

        const storedMessages =
          await Message.find({
            room: user.room,
          })
            .sort({
              createdAt: -1,
            })
            .limit(
              MESSAGE_HISTORY_LIMIT
            )
            .lean();

        const messageHistory =
          storedMessages
            .reverse()
            .map(serializeMessage);

        socket.emit(
          "messageHistory",
          messageHistory
        );

        socket.emit(
          "message",
          formatMessage(
            botName,
            "Welcome to letsTalk!"
          )
        );

        socket.broadcast
          .to(user.room)
          .emit(
            "message",
            formatMessage(
              botName,
              `${user.username} has joined the chat`
            )
          );

        io.to(user.room).emit(
          "roomUsers",
          {
            room: user.room,
            users: getRoomUsers(
              user.room
            ),
          }
        );
      } catch (error) {
        console.error(
          "Join room error:",
          error
        );

        const removedUser =
          userLeave(socket.id);

        if (removedUser) {
          socket.leave(
            removedUser.room
          );
        }

        socket.emit(
          "joinError",
          "Unable to join this room."
        );
      }
    }
  );

  socket.on(
    "chatMessage",
    async (message) => {
      try {
        const user =
          getCurrentUser(socket.id);

        const authenticatedUser =
          socket.data.authenticatedUser;

        if (!user) {
          socket.emit(
            "message",
            formatMessage(
              botName,
              "Join a room before sending messages."
            )
          );

          return;
        }

        if (
          typeof message !== "string"
        ) {
          return;
        }

        const cleanMessage =
          message.trim();

        if (!cleanMessage) {
          return;
        }

        if (
          cleanMessage.length > 1000
        ) {
          socket.emit(
            "message",
            formatMessage(
              botName,
              "Messages cannot exceed 1,000 characters."
            )
          );

          return;
        }

        const savedMessage =
          await Message.create({
            userId:
              authenticatedUser.id,

            username:
              authenticatedUser.username,

            room: user.room,

            text: cleanMessage,
          });

        io.to(user.room).emit(
          "message",
          serializeMessage(savedMessage)
        );
      } catch (error) {
        console.error(
          "Message save error:",
          error
        );

        socket.emit(
          "message",
          formatMessage(
            botName,
            "Your message could not be saved."
          )
        );
      }
    }
  );

  socket.on("disconnect", () => {
    const user =
      userLeave(socket.id);

    const authenticatedUser =
      socket.data.authenticatedUser;

    if (authenticatedUser) {
      User.findByIdAndUpdate(
        authenticatedUser.id,
        {
          lastSeenAt: new Date(),
        }
      ).catch((error) => {
        console.error(
          "Last seen update error:",
          error
        );
      });
    }

    if (!user) {
      return;
    }

    io.to(user.room).emit(
      "message",
      formatMessage(
        botName,
        `${user.username} has left the chat`
      )
    );

    io.to(user.room).emit(
      "roomUsers",
      {
        room: user.room,
        users: getRoomUsers(
          user.room
        ),
      }
    );
  });
});

const PORT =
  process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  await User.init();
  await Message.init();

  server.listen(PORT, () => {
    console.log(
      `Server running on port ${PORT}`
    );
  });
}

startServer();