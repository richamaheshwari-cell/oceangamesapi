const jwt = require("jsonwebtoken");
const { fail } = require("../utils/http");

module.exports = function requireAdminAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const [type, token] = auth.split(" ");

  if (type !== "Bearer" || !token) {
    return fail(res, 401, "UNAUTHORIZED", "Missing or invalid Authorization header");
  }

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.admin = payload; // { sub, role, email, iat, exp }
    return next();
  } catch (e) {
    // Client can use this to trigger refresh and retry
    const isExpired = e?.name === "TokenExpiredError";
    return fail(
      res,
      401,
      isExpired ? "TOKEN_EXPIRED" : "UNAUTHORIZED",
      isExpired ? "Access token expired" : "Invalid or expired token"
    );
  }
};
