import { state } from "./state.js";

import {
  renderReactions,
} from "./messages.js";

export function toggleReaction(
  socket,
  messageId,
  emoji
) {
  socket.emit(
    "message:react",
    {
      messageId,
      emoji,
    },
    (result) => {
      if (!result?.ok) {
        alert(
          result?.error ||
          "Unable to update reaction."
        );
      }
    }
  );
}

export function applyReactionUpdate({
  messageId,
  reactions,
}) {
  const message =
    state.messageStore.get(
      messageId
    );

  if (!message) {
    return;
  }

  message.reactions =
    Array.isArray(reactions)
      ? reactions
      : [];

  state.messageStore.set(
    messageId,
    message
  );

  renderReactions(
    messageId,
    message.reactions
  );
}