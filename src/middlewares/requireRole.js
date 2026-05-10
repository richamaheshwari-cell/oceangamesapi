const { fail } = require("../utils/http");

module.exports = function requireRole(...allowedRoles) {
  return function (req, res, next) {
    const role = req.admin?.role;
    if (!role || !allowedRoles.includes(role)) {
      return fail(res, 403, "FORBIDDEN", "You do not have permission to perform this action");
    }
    return next();
  };
};
