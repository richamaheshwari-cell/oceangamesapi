const { fail } = require("../utils/http");

module.exports = function notFound(req, res) {
  return fail(res, 404, "NOT_FOUND", `Route not found: ${req.method} ${req.path}`);
};
