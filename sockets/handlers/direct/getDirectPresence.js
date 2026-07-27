const {
  getPresenceSnapshot,
} = require(
  "../../services/presenceService"
);

const {
  getSocketUserId,
} = require(
  "../../services/socketAuth"
);

function acknowledge(
  callback,
  payload
) {
  if (
    typeof callback ===
    "function"
  ) {
    callback(payload);
  }
}

function getDirectPresence(
  socket
) {
  return async (
    {
      userIds,
    } = {},
    callback
  ) => {
    try {
      const requesterUserId =
        getSocketUserId(
          socket
        );

      if (!requesterUserId) {
        acknowledge(
          callback,
          {
            ok: false,

            error:
              "Authentication is required.",
          }
        );

        return;
      }

      const presence =
        await getPresenceSnapshot(
          requesterUserId,
          userIds
        );

      acknowledge(
        callback,
        {
          ok: true,

          presence,
        }
      );
    } catch (error) {
      console.error(
        "Get direct presence error:",
        error
      );

      acknowledge(
        callback,
        {
          ok: false,

          error:
            "Unable to load direct-message presence.",
        }
      );
    }
  };
}

module.exports =
  getDirectPresence;