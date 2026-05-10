/**
 * In-memory IP block list for abusive traffic (e.g. repeated failed logins).
 * Block duration and max fails are configurable via env.
 */

const failCounts = new Map(); // ip -> { count, firstFailAt }
const blockedUntil = new Map(); // ip -> Date

const MAX_FAILS = Number(process.env.RATE_LIMIT_BLOCK_AFTER_FAILS || 10);
const BLOCK_DURATION_MS = Number(process.env.RATE_LIMIT_BLOCK_DURATION_MS || 60 * 60 * 1000); // 1 hour
const FAIL_WINDOW_MS = Number(process.env.RATE_LIMIT_FAIL_WINDOW_MS || 15 * 60 * 1000); // 15 min

function getIp(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function isBlocked(ip) {
  const until = blockedUntil.get(ip);
  if (!until) return false;
  if (until < new Date()) {
    blockedUntil.delete(ip);
    failCounts.delete(ip);
    return false;
  }
  return true;
}

function recordFail(reqOrIp) {
  const ip = typeof reqOrIp === "string" ? reqOrIp : getIp(reqOrIp);
  const now = new Date();
  let rec = failCounts.get(ip);
  if (!rec) {
    rec = { count: 0, firstFailAt: now };
    failCounts.set(ip, rec);
  }
  if (now - rec.firstFailAt > FAIL_WINDOW_MS) {
    rec.count = 0;
    rec.firstFailAt = now;
  }
  rec.count += 1;
  if (rec.count >= MAX_FAILS) {
    blockedUntil.set(ip, new Date(now.getTime() + BLOCK_DURATION_MS));
  }
}

function clearSuccess(reqOrIp) {
  const ip = typeof reqOrIp === "string" ? reqOrIp : getIp(reqOrIp);
  failCounts.delete(ip);
}

function blockListMiddleware(req, res, next) {
  const ip = getIp(req);
  if (isBlocked(ip)) {
    return res.status(403).json({
      error: {
        code: "IP_BLOCKED",
        message: "Too many failed attempts. Try again later.",
      },
    });
  }
  next();
}

module.exports = {
  blockListMiddleware,
  recordFail,
  clearSuccess,
  isBlocked,
  getIp,
};
