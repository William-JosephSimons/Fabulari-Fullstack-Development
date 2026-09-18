import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const currentFolder = path.dirname(fileURLToPath(import.meta.url));
const uploadsFolder = path.join(currentFolder, "uploads");
const avatarFolder = path.join(uploadsFolder, "avatars");
const chatImageFolder = path.join(uploadsFolder, "chat");
const imageExtensions = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
};

// Create the destination folder for Multer
fs.mkdirSync(avatarFolder, { recursive: true });
fs.mkdirSync(chatImageFolder, { recursive: true });

// diskStorage tells Multer where to write a file and how to name it.
const avatarStorage = multer.diskStorage({
  // Save profile images in the avatar upload folder.
  destination(req, file, callback) {
    callback(null, avatarFolder);
  },
  // Replace the original name with a random ID and trusted extension.
  filename(req, file, callback) {
    callback(null, `${randomUUID()}${imageExtensions[file.mimetype]}`);
  },
});

const chatImageStorage = multer.diskStorage({
  // Save message images separately from profile images.
  destination(req, file, callback) {
    callback(null, chatImageFolder);
  },
  // Replace the original name with a random ID and trusted extension.
  filename(req, file, callback) {
    callback(null, `${randomUUID()}${imageExtensions[file.mimetype]}`);
  },
});

// single("image"/"avatar") accepts the one multipart field and places its details on req.file.
const receiveAvatarFile = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // roughly 2MB.
  // Reject file types outside the three profile-image formats.
  fileFilter(req, file, callback) {
    if (!imageExtensions[file.mimetype]) {
      callback(new Error("Only PNG, JPEG and GIF profile images are allowed."));
      return;
    }

    callback(null, true);
  },
}).single("avatar");

const receiveChatImage = multer({
  storage: chatImageStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  // Reject file types outside the three chat-image formats.
  fileFilter(req, file, callback) {
    if (!imageExtensions[file.mimetype]) {
      callback(new Error("Only PNG, JPEG and GIF chat images are allowed."));
      return;
    }

    callback(null, true);
  },
}).single("image");

// Convert Multer avatar errors into the JSON response used by Angular.
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

// Convert Multer chat-image errors into the JSON response used by Angular.
function uploadChatImage(req, res, next) {
  receiveChatImage(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    let message = error.message || "The chat image could not be uploaded.";

    if (error.code === "LIMIT_FILE_SIZE") {
      message = "Chat images cannot be larger than 2 MB.";
    } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Upload one chat image using the image field.";
    }

    res.status(400).json({ valid: false, message });
  });
}

// File cleanup should not fail the database operation that already succeeded.
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

// Chat-image cleanup follows the same best-effort rule as avatar cleanup.
function removeChatImage(imageUrl) {
  if (!imageUrl) {
    return;
  }

  const imagePath = path.join(chatImageFolder, path.basename(imageUrl));

  try {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  } catch (error) {
    console.warn("Unable to remove the chat image:", error.message);
  }
}

export {
  uploadsFolder,
  uploadAvatar,
  uploadChatImage,
  removeAvatar,
  removeChatImage,
};
