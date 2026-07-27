const express = require("express");
const path = require("path");

const router = express.Router();

const messagesPage = path.join(
  __dirname,
  "..",
  "private",
  "messages.html"
);

router.get(
  "/messages",
  (request, response) => {
    if (!request.session?.userId) {
      response.redirect("/");
      return;
    }

    response.sendFile(messagesPage);
  }
);

module.exports = router;