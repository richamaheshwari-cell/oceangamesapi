const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * Sign short-lived access token (JWT)
 */
function signAccessToken(admin) {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET is missing");
  }

  const ttl = process.env.ACCESS_TOKEN_TTL || "15m";

  return jwt.sign(
    {
      sub: admin.id,
      role: admin.role,
      email: admin.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: ttl }
  );
}

/**
 * Generate opaque refresh token (stored hashed in DB)
 */
function newRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

/**
 * Hash refresh token before storing
 */
function hashRefreshToken(token) {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET is missing");
  }

  return crypto
    .createHmac("sha256", process.env.REFRESH_TOKEN_SECRET)
    .update(token)
    .digest("hex");
}

/**
 * Refresh token expiry date
 */
function refreshExpiryDate() {
  const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Generate opaque password reset token (store hashed in DB)
 */
function newPasswordResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash password reset token before storing (uses PASSWORD_RESET_SECRET)
 */
function hashPasswordResetToken(token) {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error("PASSWORD_RESET_SECRET or REFRESH_TOKEN_SECRET is missing");
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

/**
 * Password reset token expiry (e.g. 1 hour)
 */
function passwordResetExpiry() {
  const hours = Number(process.env.PASSWORD_RESET_TTL_HOURS || 1);
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

module.exports = {
  signAccessToken,
  newRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  newPasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiry,
};
