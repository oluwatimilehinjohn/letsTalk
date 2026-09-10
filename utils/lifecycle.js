const { log, failure } = require("./logger");
function createLifecycle() {
  const closers = [];
  let closing;
  function add(close) { closers.push(close); }
  function close() {
    if (!closing) closing = (async () => {
      for (const shutdown of closers.reverse()) {
        try { await shutdown(); } catch (error) { failure("shutdown.resource.failed", error); }
      }
    })();
    return closing;
  }
  async function stop(code = 0) {
    const deadline = setTimeout(() => process.exit(1), 30000);
    deadline.unref();
    await close();
    clearTimeout(deadline);
    process.exitCode = code;
    log("info", "shutdown.complete");
  }
  function signals() {
    process.once("SIGINT", () => { void stop(); });
    process.once("SIGTERM", () => { void stop(); });
  }
  return { add, close, stop, signals };
}
module.exports = { createLifecycle };
