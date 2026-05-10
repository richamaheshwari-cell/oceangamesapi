/**
 * Delete an uploaded image file from disk by URL or path.
 * Only allows deletion of files under uploads/images/ (no path traversal).
 * Used when deleting content (casino, article, etc.) and by admin "delete image by path" API.
 *
 * @param {string} urlOrPath - Full URL (e.g. https://api.example.com/uploads/images/xxx.jpg) or path (/uploads/images/xxx.jpg)
 * @returns {{ deleted: boolean, error?: string }} - deleted: true if file was removed, false if not found or invalid
 */
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "images");
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

function deleteUploadedImage(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== "string") {
    return { deleted: false, error: "Missing path or url" };
  }

  // Extract path segment after /uploads/images/ (from URL or path)
  let segment = urlOrPath
    .replace(/^https?:\/\/[^/]+/, "") // strip origin
    .replace(/^\/+/, "")              // strip leading slashes
    .replace(/\\/g, "/");

  // Must be exactly "uploads/images/<filename>"
  if (!segment.startsWith("uploads/images/")) {
    return { deleted: false, error: "Path must be under uploads/images/" };
  }

  const filename = segment.replace(/^uploads\/images\//, "").split("/")[0];
  if (!filename) {
    return { deleted: false, error: "Invalid filename" };
  }

  // No path traversal: filename must not contain .. or path separators
  if (filename.includes("..") || path.isAbsolute(filename) || filename.includes("/") || filename.includes("\\")) {
    return { deleted: false, error: "Invalid filename" };
  }

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return { deleted: false, error: "Invalid file type" };
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  // Resolve and ensure still under UPLOAD_DIR
  const resolved = path.resolve(filePath);
  const resolvedDir = path.resolve(UPLOAD_DIR);
  if (!resolved.startsWith(resolvedDir) || resolved === resolvedDir) {
    return { deleted: false, error: "Invalid path" };
  }

  try {
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
      return { deleted: true };
    }
    return { deleted: false };
  } catch (err) {
    return { deleted: false, error: err.message };
  }
}

module.exports = { deleteUploadedImage };
