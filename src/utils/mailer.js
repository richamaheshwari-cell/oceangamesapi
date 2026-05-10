const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const options = {
    host,
    port,
    secure,
    auth: { user, pass },
  };
  // Port 587 typically uses STARTTLS, not direct SSL
  if (port === 587) {
    options.secure = false;
    options.requireTLS = true;
  }
  transporter = nodemailer.createTransport(options);
  return transporter;
}

function resetTransporter() {
  transporter = null;
}

/**
 * Send email (admin password reset, etc.)
 * Options: { from, to, subject, text, html }
 */
async function sendMail(options) {
  const transport = getTransporter();
  if (!transport) throw new Error("SMTP not configured");
  try {
    return await transport.sendMail(options);
  } catch (err) {
    resetTransporter();
    const detail = [
      err?.message,
      err?.code && `code: ${err.code}`,
      err?.response && `response: ${String(err.response).slice(0, 200)}`,
    ]
      .filter(Boolean)
      .join(" | ");
    console.error("[mailer] Send failed:", detail);
    if (process.env.NODE_ENV !== "production") console.error("[mailer] Full error:", err);
    throw err;
  }
}

/**
 * Send admin password reset email
 * @param {string} to - admin email
 * @param {string} resetLink - full URL to frontend reset page with token (e.g. https://admin.example.com/reset-password?token=xxx)
 */
async function sendPasswordResetEmail(to, resetLink) {
  const from = process.env.RESET_PASSWORD_FROM_EMAIL || process.env.SMTP_USER;
  const subject = process.env.RESET_PASSWORD_SUBJECT || "Reset your password";
  const html =
    process.env.RESET_PASSWORD_HTML ||
    `<!DOCTYPE html><html><body><p>You requested a password reset. Click the link below (valid for 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you didn't request this, ignore this email.</p></body></html>`;
  const text = `Reset your password: ${resetLink}\n\nIf you didn't request this, ignore this email.`;
  return sendMail({ from, to, subject, text, html });
}

module.exports = {
  getTransporter,
  resetTransporter,
  sendMail,
  sendPasswordResetEmail,
};
