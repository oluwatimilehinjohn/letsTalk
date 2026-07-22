function requireAuthPage(request, response, next) {
  if (!request.session.userId) {
    response.redirect("/");
    return;
  }

  next();
}

module.exports = requireAuthPage;