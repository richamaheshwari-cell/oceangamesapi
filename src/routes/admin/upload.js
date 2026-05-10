const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");

const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");
const { deleteUploadedImage } = require("../../utils/deleteUploadedImage");

const router = express.Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "images");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(new Error("Invalid file type"));
    }
    const name = `${crypto.randomUUID()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      !ALLOWED_MIMES.includes(file.mimetype) ||
      !ALLOWED_EXT.includes(ext || ".jpg")
    ) {
      return cb(
        new Error(
          "Only images allowed (JPEG, PNG, GIF, WebP). Max size 5MB."
        )
      );
    }
    cb(null, true);
  },
});

function getBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

router.post(
  "/upload/image",
  requireAdminAuth,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              error: {
                code: "BAD_REQUEST",
                message: "File too large. Maximum size is 5MB.",
              },
            });
          }
        }
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: err.message || "Invalid file upload",
          },
        });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message:
            "Missing file. Send multipart/form-data with field name 'image'.",
        },
      });
    }
    const baseUrl = getBaseUrl(req);
    const url = `${baseUrl}/uploads/images/${req.file.filename}`;
    res.status(201).json({ data: { url } });
  }
);

// DELETE image by path or url (admin only). Query: ?path=... or body: { path } or { url }.
router.delete(
  "/upload/image",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const pathOrUrl = req.query.path ?? req.body?.path ?? req.body?.url;
    if (!pathOrUrl) {
      return fail(res, 400, "BAD_REQUEST", "Provide 'path' or 'url' (query or body), e.g. /uploads/images/xxx.jpg");
    }
    const result = deleteUploadedImage(pathOrUrl);
    if (result.error && result.error !== "Missing path or url") {
      return fail(res, 400, "BAD_REQUEST", result.error);
    }
    return ok(res, { deleted: result.deleted });
  })
);

module.exports = router;
