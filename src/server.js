const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");

require("dotenv").config();

const routes = require("./routes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// trust proxy for VPS / reverse proxy setups
app.set("trust proxy", 1);

// CORS first so preflight (OPTIONS) always gets headers before any other middleware
const corsOrigin = process.env.CORS_ORIGIN;
const defaultOrigins = ["http://localhost:5173", "http://localhost:3001","http://localhost:3000","http://localhost:3003"];
const corsOrigins = corsOrigin
  ? corsOrigin.split(",").map((o) => o.trim()).filter(Boolean)
  : defaultOrigins;
console.log("CORS allowed origins:", corsOrigins);
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// security + common middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // ✅ key
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.json({ limit: "1mb" }));

// logs
app.use(morgan("dev"));

// health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "tog_backend", time: new Date().toISOString() });
});

// serve uploaded images (so returned URLs are reachable)
const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsPath));

// routes
app.use(routes);

// 404 + error handler (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
