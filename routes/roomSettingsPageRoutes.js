const path = require("path");
const express = require("express");

const {
  findRoomByIdentifier,
  getRoomMember,
} = require(
  "../services/roomService"
);

const router =
  express.Router();

router.get(
  "/rooms/:identifier/settings",
  async (
    request,
    response
  ) => {
    try {
      const userId =
        request.session?.userId;

      if (!userId) {
        response.redirect("/");
        return;
      }

      const room =
        await findRoomByIdentifier(
          request.params.identifier
        );

      if (!room) {
        response.redirect("/rooms");
        return;
      }

      const membership =
        getRoomMember(
          room,
          userId
        );

      if (
        !membership ||
        ![
          "owner",
          "admin",
        ].includes(
          membership.role
        )
      ) {
        response.redirect("/rooms");
        return;
      }

      response.sendFile(
        path.join(
          __dirname,
          "..",
          "private",
          "room-settings.html"
        )
      );
    } catch (error) {
      console.error(
        "Room settings page error:",
        error
      );

      response.redirect("/rooms");
    }
  }
);

module.exports = router;