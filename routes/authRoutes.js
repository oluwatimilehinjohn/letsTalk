const express = require("express");
const bcrypt = require("bcryptjs");

const {
  rateLimit,
} = require("express-rate-limit");

const User = require("../models/User");
const publicUser = require("../utils/publicUser");

const {
  regenerateSession,
  saveSession,
  destroySession,
} = require("../utils/sessionHelpers");

const USERNAME_PATTERN =
  /^[A-Za-z0-9_]{3,24}$/;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createAuthRouter(io) {
  const router = express.Router();

  const isProduction =
    process.env.NODE_ENV === "production";

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

  router.post(
    "/register",
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

        if (!USERNAME_PATTERN.test(username)) {
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

  router.post(
    "/login",
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
        console.error(
          "Login error:",
          error
        );

        response.status(500).json({
          error: "Unable to log in.",
        });
      }
    }
  );

  router.get(
    "/me",
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

  router.post(
    "/logout",
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

  return router;
}

module.exports = createAuthRouter;