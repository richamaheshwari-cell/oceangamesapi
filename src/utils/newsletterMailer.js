const nodemailer = require("nodemailer");

let transporter = null;

function getNewsletterTransporter() {
  if (transporter) return transporter;
  const host =
    process.env.NEWSLETTER_SMTP_HOST ||
    process.env.SMTP_HOST;
  const port = Number(
    process.env.NEWSLETTER_SMTP_PORT ||
    process.env.SMTP_PORT ||
    587
  );
  const secure =
    process.env.NEWSLETTER_SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "true";
  const user =
    process.env.NEWSLETTER_SMTP_USER ||
    process.env.SMTP_USER;
  const pass =
    process.env.NEWSLETTER_SMTP_PASS ||
    process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,     // true only for 465, false for 587
    requireTLS: port === 587, // STARTTLS only for 587
    auth: { user, pass },
  });

  return transporter;
}

function getFrom() {
  return (
    process.env.NEWSLETTER_FROM_EMAIL ||
    process.env.SMTP_USER
  );
}

/**
 * Base URL for the public site (newsletter links). Local: http://localhost:3001, Production: https://theoceansgame.com
 */
function getNewsletterSiteUrl() {
  const url = ("https://theoceangame.com").replace(/\/$/, "");
  return url;
}

function getVisitUrl() {
  return getNewsletterSiteUrl() + "/";
}

function getUnsubscribeUrl() {
  return getNewsletterSiteUrl() + "/newsletter/unsubscribe";
}

/**
 * Build HTML for "new news" newsletter email (The Ocean Game style).
 * @param {{ title: string, slug: string, featureImg: string | null, shortDesc: string }} news
 */
function buildNewNewsEmailHtml(news) {
  const visitUrl = getVisitUrl();
  const unsubscribeUrl = getUnsubscribeUrl();
  const articleUrl = getNewsletterSiteUrl() + "/news/" + encodeURIComponent(news.slug);
  const imgSrc = news.featureImg || "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
    <!-- Header -->
    <tr>
      <td style="background:#1a1a2e;padding:24px 20px;text-align:center;">
        <div style="color:#fff;font-size:22px;font-weight:bold;">The Ocean Game</div>
        <div style="color:#e63946;font-size:12px;letter-spacing:1px;margin-top:6px;">WEEKLY CASINO UPDATE</div>
      </td>
    </tr>
    <!-- Greeting -->
    <tr>
      <td style="padding:24px 20px 0;">
        <p style="margin:0 0 12px;font-weight:bold;font-size:16px;">Hello Casino Enthusiast,</p>
        <p style="margin:0 0 20px;color:#333;line-height:1.6;font-size:14px;">Welcome to the latest edition of the The Ocean Game Newsletter, your trusted destination for accurate casino news, in-depth blogs, and meaningful iGaming insights.</p>
      </td>
    </tr>
    <!-- Featured Article -->
    <tr>
      <td style="padding:0 20px 20px;">
        <div style="border:1px solid #e63946;background:#fff5f5;color:#e63946;font-size:11px;letter-spacing:1px;padding:8px 12px;display:inline-block;margin-bottom:12px;">FEATURED ARTICLE</div>
        ${imgSrc ? `<a href="${articleUrl}" style="display:block;margin-bottom:12px;"><img src="${imgSrc}" alt="" style="max-width:100%;height:auto;border:0;" /></a>` : ""}
        <a href="${articleUrl}" style="color:#1a1a2e;font-size:18px;font-weight:bold;text-decoration:none;line-height:1.4;display:block;">${escapeHtml(news.title)}</a>
        ${news.shortDesc ? `<p style="margin:8px 0 0;color:#555;font-size:14px;line-height:1.5;">${escapeHtml(news.shortDesc)}</p>` : ""}
        <p style="margin:12px 0 0;"><a href="${articleUrl}" style="color:#e63946;font-size:14px;text-decoration:none;">Read more →</a></p>
      </td>
    </tr>
    <!-- Why Read -->
    <tr>
      <td style="padding:20px 20px 0;">
        <p style="margin:0 0 12px;font-weight:bold;font-size:16px;color:#1a1a2e;">Why Read The Ocean Game</p>
        <ul style="margin:0;padding:0 0 0 20px;color:#333;font-size:14px;line-height:1.8;">
          <li>Independent and unbiased casino journalism</li>
          <li>Data-driven blogs and news coverage</li>
          <li>Global casino and iGaming market focus</li>
          <li>Content tailored for both players and professionals</li>
        </ul>
      </td>
    </tr>
    <!-- CTA -->
    <tr>
      <td style="padding:24px 20px;">
        <div style="background:#e63946;padding:24px;text-align:center;">
          <p style="margin:0 0 8px;color:#fff;font-size:20px;font-weight:bold;">Stay Updated</p>
          <p style="margin:0 0 16px;color:#fff;font-size:14px;opacity:0.95;">For regular casino news, expert blogs, and industry insights</p>
          <a href="${visitUrl}" style="display:inline-block;background:#fff;color:#e63946;padding:12px 24px;text-decoration:none;font-weight:bold;font-size:14px;">Visit The Ocean Game</a>
        </div>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background:#2d3748;padding:20px;color:#a0aec0;font-size:12px;text-align:center;">
        <p style="margin:0 0 8px;">The Ocean Game - Casino News. Industry Insights. Trusted Coverage.</p>
        <p style="margin:0 0 8px;"><a href="${visitUrl}" style="color:#63b3ed;">Facebook</a> | <a href="${visitUrl}" style="color:#63b3ed;">Twitter</a> | <a href="${visitUrl}" style="color:#63b3ed;">Instagram</a></p>
        <p style="margin:0 0 12px;">You're receiving this email because you subscribed to The Ocean Game newsletter.</p>
        <p style="margin:0;"><a href="${unsubscribeUrl}" style="color:#63b3ed;">Unsubscribe</a> | <a href="${visitUrl}" style="color:#63b3ed;">Update Preferences</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Send "new news" newsletter email to one subscriber. Called in a loop or batch.
 */
async function sendNewsletterNewNewsEmail(to, news) {
  const transport = getNewsletterTransporter();
  if (!transport) return;
  const from = getFrom();
  const subject = process.env.NEWSLETTER_NEWS_SUBJECT || "New at The Ocean Game: " + (news.title || "News & Updates");
  const html = buildNewNewsEmailHtml(news);
  const text = `${news.title}\n\n${news.shortDesc || ""}\n\nRead more: ${getNewsletterSiteUrl()}/news/${news.slug}\n\nVisit: ${getVisitUrl()}\nUnsubscribe: ${getUnsubscribeUrl()}`;
  return transport.sendMail({ from, to, subject, text, html });
}

async function sendNewsletterSubscribedEmail(to) {
  const transport = getNewsletterTransporter();
  if (!transport) return;
  const from = getFrom();
  const subject =
    process.env.NEWSLETTER_SUBSCRIBED_SUBJECT ||
    "You're subscribed to our newsletter";
  const text =
    process.env.NEWSLETTER_SUBSCRIBED_TEXT ||
    `You have been subscribed. You can unsubscribe anytime via the link in our emails.`;
  return transport.sendMail({ from, to, subject, text });
}

async function sendNewsletterUnsubscribedEmail(to) {
  const transport = getNewsletterTransporter();
  if (!transport) return;
  const from = getFrom();
  const subject =
    process.env.NEWSLETTER_UNSUBSCRIBED_SUBJECT ||
    "You've unsubscribed";
  const text =
    process.env.NEWSLETTER_UNSUBSCRIBED_TEXT ||
    `You have been unsubscribed. You can resubscribe anytime from our website.`;
  return transport.sendMail({ from, to, subject, text });
}

module.exports = {
  getNewsletterTransporter,
  getNewsletterSiteUrl,
  getVisitUrl,
  getUnsubscribeUrl,
  sendNewsletterSubscribedEmail,
  sendNewsletterUnsubscribedEmail,
  sendNewsletterNewNewsEmail,
};
