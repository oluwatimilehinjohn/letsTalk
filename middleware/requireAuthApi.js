function requireAuthApi(
  request,
  response,
  next
) {
  if (!request.session.userId) {
    response.status(401).json({
      error: "Authentication required.",
    });

    return;
  }

  next();
}

module.exports = requireAuthApi;