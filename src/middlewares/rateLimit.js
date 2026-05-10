const rateLimit = require("express-rate-limit");

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000); // 15 min

function createLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs ?? RATE_LIMIT_WINDOW_MS,
    max: options.max,
    message: {
      error: {
        code: "TOO_MANY_REQUESTS",
        message: options.message || "Too many requests. Try again later.",
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
}

// Admin auth: login, refresh, forgot-password, reset-password
const adminAuthLimiter = createLimiter({
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 15 * 60 * 1000),
  message: "Too many auth attempts. Try again later.",
});

// Public newsletter: subscribe, unsubscribe
const newsletterLimiter = createLimiter({
  max: Number(process.env.RATE_LIMIT_NEWSLETTER_MAX || 10),
  windowMs: Number(process.env.RATE_LIMIT_NEWSLETTER_WINDOW_MS || 15 * 60 * 1000),
  message: "Too many subscription requests. Try again later.",
});

// Optional: general API rate limit (all /api/v1/*)
const generalApiLimiter = createLimiter({
  max: Number(process.env.RATE_LIMIT_GENERAL_MAX || 500),
  windowMs: RATE_LIMIT_WINDOW_MS,
  message: "Too many requests. Try again later.",
});

module.exports = {
  adminAuthLimiter,
  newsletterLimiter,
  generalApiLimiter,
};
