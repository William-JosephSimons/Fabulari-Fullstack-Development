import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const currentFolder = path.dirname(fileURLToPath(import.meta.url));
const uploadsFolder = path.join(currentFolder, "uploads");
const avatarFolder = path.join(uploadsFolder, "avatars");
const imageExtensions = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
};

// Create the destination folder for Multer
fs.mkdirSync(avatarFolder, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, avatarFolder);
  },
  filename(req, file, callback) {
    callback(null, `${randomUUID()}${imageExtensions[file.mimetype]}`);
  },
});

const receiveAvatarFile = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // roughly 2MB.
  fileFilter(req, file, callback) {
    if (!imageExtensions[file.mimetype]) {
      callback(new Error("Only PNG, JPEG and GIF profile images are allowed."));
      return;
    }

    callback(null, true);
  },
}).single("avatar");

function uploadAvatar(req, res, next) {
  receiveAvatarFile(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    let message = error.message || "The profile image could not be uploaded.";

    if (error.code === "LIMIT_FILE_SIZE") {
      message = "Profile images cannot be larger than 2 MB.";
    } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Upload one profile image using the avatar field.";
    }

    res.status(400).json({ valid: false, message });
  });
}

function removeAvatar(avatarUrl) {
  if (!avatarUrl) {
    return;
  }

  const avatarPath = path.join(avatarFolder, path.basename(avatarUrl));

  try {
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }
  } catch (error) {
    console.warn("Unable to remove the previous profile image:", error.message);
  }
}

export { uploadsFolder, uploadAvatar, removeAvatar };
