const { UnrecoverableError } = require("bullmq");
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function renderEmail(user, template, summary, date, appUrl) {
  const url = new URL(appUrl);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("APP_URL must use HTTP or HTTPS");
  const greeting = `Hi ${user.displayName || user.username},`;
  const welcome = template === "welcome-email";
  const subject = welcome ? "Welcome to Let's Talk!" : `Your Let's Talk summary for ${date}`;
  const paragraphs = welcome
    ? [greeting, "Welcome to Let's Talk! Your account is ready. Join a room or start a private conversation.",
      "Every morning at 7 a.m. Nigerian time, we'll email you a summary of the previous day's messages in your conversations."]
    : [greeting, `Your message summary for ${date} (Nigerian time).`,
      summary.count ? `${summary.count} messages across ${summary.conversationCount} conversations.` : "No messages in your conversations yesterday.",
      ...summary.sections.flatMap(section => [`${section.title}: ${section.count} messages`, ...section.previews.map(text => `- ${text}`)]),
      ...(summary.conversationCount > summary.sections.length ? ["Open the app to see your remaining conversations."] : [])];
  return { subject, text: [...paragraphs, `Open Let's Talk: ${url.href}`].join("\n\n"),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1>${escapeHtml(subject)}</h1>${paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join("")}<p><a href="${escapeHtml(url.href)}">Open Let's Talk</a></p></div>` };
}
function createEmailSender({ env = process.env, fetchImpl = fetch } = {}) {
  return {
    config() {
      if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.APP_URL) throw new Error("Configure RESEND_API_KEY, EMAIL_FROM and APP_URL to send email");
      return { from: env.EMAIL_FROM, appUrl: env.APP_URL };
    },
    async send(payload, key) {
      this.config();
      const response = await fetchImpl("https://api.resend.com/emails", { method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        const ErrorType = response.status === 429 || response.status >= 500 ? Error : UnrecoverableError;
        // Never include provider response bodies (which may contain recipient data) in logs.
        throw new ErrorType(`Email provider returned HTTP ${response.status}`);
      }
      const result = await response.json();
      if (!result.id) throw new Error("Email provider did not return a delivery ID");
      return result.id;
    },
  };
}
module.exports = { renderEmail, createEmailSender };
