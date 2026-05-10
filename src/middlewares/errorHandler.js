const { fail } = require("../utils/http");

module.exports = function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || "Something went wrong";

  // log full error in server console (good for dev + VPS logs)
  console.error("ERROR:", {
    method: req.method,
    path: req.path,
    status,
    code,
    message,
    stack: err.stack,
  });

  return fail(res, status, code, message);
};
