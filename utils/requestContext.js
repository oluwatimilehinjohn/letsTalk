const { AsyncLocalStorage } = require("node:async_hooks");
const { randomUUID } = require("node:crypto");
const { log } = require("./logger");
const context = new AsyncLocalStorage();
function requestContext(req, res, next) {
  const requestId = randomUUID();
  const start = Date.now();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.on("finish", () => log("info", "http.completed", { requestId, status: res.statusCode, durationMs: Date.now() - start }));
  context.run({ requestId }, next);
}
// Higher-order handler keeps correlation separate from socket business logic.
const socketContext = (handler, socketEvent) => (...args) => {
  const requestId = randomUUID();
  log("info", "socket.received", { requestId, socketEvent });
  return context.run({ requestId }, () => handler(...args));
};
module.exports = { context, requestContext, socketContext };
