const path = require("path");
const express = require("express");

const User = require(
  "../models/User"
);

const requireAuthPage = require(
  "../middleware/requireAuthPage"
);

function createPageRouter() {
  const router = express.Router();

  const publicDirectory = path.join(
    __dirname,
    "..",
    "public"
  );

  const privateDirectory = path.join(
    __dirname,
    "..",
    "private"
  );

  router.get("/", (request, response) => {
    if (request.session.userId) {
      response.redirect("/rooms");
      return;
    }

    response.sendFile(
      path.join(publicDirectory, "index.html")
    );
  });

  router.get(
    "/rooms",
    requireAuthPage,
    (request, response) => {
      response.sendFile(
        path.join(privateDirectory, "rooms.html")
      );
    }
  );

  router.get(
    "/chat",
    requireAuthPage,
    (request, response) => {
      response.sendFile(
        path.join(privateDirectory, "chat.html")
      );
    }
  );
  router.get(
  "/profile",
  requireAuthPage,
  (request, response) => {
    response.sendFile(
      path.join(
        privateDirectory,
        "profile.html"
      )
    );
  }
);

router.get(
  "/users/:username",
  requireAuthPage,
  async (
    request,
    response,
    next
  ) => {
    try {
      const currentUser =
        await User.findById(
          request.session.userId
        )
          .select("usernameLower")
          .lean();

      if (!currentUser) {
        response.redirect("/");
        return;
      }

      const requestedUsername =
        String(
          request.params.username || ""
        )
          .trim()
          .toLowerCase();

      if (
        requestedUsername ===
        currentUser.usernameLower
      ) {
        response.redirect("/profile");
        return;
      }

      response.sendFile(
        path.join(
          privateDirectory,
          "user-profile.html"
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

  return router;
}

module.exports = createPageRouter;