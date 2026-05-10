function ok(res, data, meta) {
  return res.json({ data, meta });
}

function fail(res, status, code, message, details) {
  return res.status(status).json({
    error: { code, message, details },
  });
}

module.exports = { ok, fail };
