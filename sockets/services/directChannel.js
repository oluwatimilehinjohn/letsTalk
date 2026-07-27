function getDirectChannel(
  conversationId
) {
  const normalizedConversationId =
    String(
      conversationId || ""
    ).trim();

  if (!normalizedConversationId) {
    throw new Error(
      "A direct conversation ID is required."
    );
  }

  return `direct:${normalizedConversationId}`;
}

module.exports = {
  getDirectChannel,
};