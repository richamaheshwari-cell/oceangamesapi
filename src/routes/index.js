const express = require("express");
const { blockListMiddleware } = require("../middlewares/blockList");
const { adminAuthLimiter, newsletterLimiter } = require("../middlewares/rateLimit");

const admin = require("./admin");
const publicApi = require("./public");

const router = express.Router();

// Auth paths: block list (after too many fails) + rate limit
function adminAuthSecurity(req, res, next) {
  if (!req.path.startsWith("/api/v1/admin/auth")) return next();
  blockListMiddleware(req, res, (err) => {
    if (err) return next(err);
    adminAuthLimiter(req, res, next);
  });
}

function publicNewsletterLimit(req, res, next) {
  if (!req.path.startsWith("/api/v1/public/newsletter")) return next();
  newsletterLimiter(req, res, next);
}

// Versioned API prefix (production best practice)
router.use("/api/v1/admin", adminAuthSecurity, admin);
router.use("/api/v1/public", publicNewsletterLimit, publicApi);

module.exports = router;
