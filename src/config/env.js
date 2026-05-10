require("dotenv").config();

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3000),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  JWT_SECRET: must("JWT_SECRET"),
  DATABASE_URL: must("DATABASE_URL"),
};
