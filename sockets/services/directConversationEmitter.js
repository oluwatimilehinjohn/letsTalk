const {
  createConversationSnapshots,
} = require(
  "../../services/directMessageRealTimeService"
);

const {
  getUserChannel,
} = require(
  "./userChannel"
);

function emitDirectConversationActivity(
  io,
  conversation
) {
  const snapshots =
    createConversationSnapshots(
      conversation
    );

  for (
    const snapshot
    of snapshots
  ) {
    io.to(
      getUserChannel(
        snapshot.userId
      )
    ).emit(
      "directConversationActivity",
      {
        conversation:
          snapshot.conversation,
      }
    );
  }
}

module.exports = {
  emitDirectConversationActivity,
};