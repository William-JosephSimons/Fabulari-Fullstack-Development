import { randomUUID } from "node:crypto";
import {
  loginRequiredMiddleware,
  requireLogin,
} from "../authentication.js";
import { getDatabase } from "../database.js";
import { removeChatImage, uploadChatImage } from "../upload.js";
import { meetsMinimumAge } from "./route-helpers.js";

function messageRoutes(app, io) {
  app.get("/api/rooms/:id/messages", async (req, res) => {
    const user = await requireLogin(req, res);

    if (!user) {
      return;
    }

    const database = getDatabase();
    const room = await database
      .collection("rooms")
      .findOne({ id: req.params.id });

    if (!room) {
      return res.status(404).json({
        valid: false,
        message: "Chat room was not found.",
      });
    }

    const group = await database
      .collection("groups")
      .findOne({ id: room.groupId });

    if (
      !group ||
      user.systemRole !== "user" ||
      !group.memberIds.includes(user.id) ||
      !meetsMinimumAge(user, group.minimumAge)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only eligible group members can view these messages.",
      });
    }

    const storedMessages = await database
      .collection("messages")
      .find({ roomId: room.id }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    const senderIds = [
      ...new Set(storedMessages.map((message) => message.userId)),
    ];
    const senders = await database
      .collection("users")
      .find({ id: { $in: senderIds } })
      .toArray();

    const messages = storedMessages.reverse().map((message) => {
      const sender = senders.find((item) => item.id === message.userId);

      return {
        ...message,
        userName: sender?.firstName || "Unknown user",
        initial: sender?.firstName.charAt(0).toUpperCase() || "?",
        avatarUrl: sender?.avatarUrl || null,
        isAdmin: group.adminIds.includes(message.userId),
      };
    });

    return res.status(200).json({
      valid: true,
      messages,
    });
  });

  app.post(
    "/api/rooms/:id/message-images",
    // Check the login before Multer writes an uploaded file to disk.
    loginRequiredMiddleware,
    uploadChatImage,
    async (req, res) => {
      const user = req.currentUser;

      if (!req.file) {
        return res.status(400).json({
          valid: false,
          message: "Choose an image to upload.",
        });
      }

      if (req.file.size === 0) {
        removeChatImage(req.file.filename);
        return res.status(400).json({
          valid: false,
          message: "The selected chat image is empty.",
        });
      }

      const imageUrl = `/uploads/chat/${req.file.filename}`;
      const database = getDatabase();
      const room = await database
        .collection("rooms")
        .findOne({ id: req.params.id });

      if (!room) {
        removeChatImage(imageUrl);
        return res.status(404).json({
          valid: false,
          message: "Chat room was not found.",
        });
      }

      const group = await database
        .collection("groups")
        .findOne({ id: room.groupId });

      if (
        !group ||
        user.systemRole !== "user" ||
        !group.memberIds.includes(user.id) ||
        !meetsMinimumAge(user, group.minimumAge)
      ) {
        removeChatImage(imageUrl);
        return res.status(403).json({
          valid: false,
          message: "Only eligible group members can send chat images.",
        });
      }

      const message = {
        id: `message-${randomUUID()}`,
        roomId: room.id,
        userId: user.id,
        type: "image",
        imageUrl,
        createdAt: new Date().toISOString(),
      };
      const messages = database.collection("messages");
      await messages.insertOne({ ...message });

      const olderMessages = await messages
        .find({ roomId: room.id })
        .sort({ createdAt: -1 })
        .skip(5)
        .toArray();

      if (olderMessages.length > 0) {
        await messages.deleteMany({
          _id: { $in: olderMessages.map((item) => item._id) },
        });

        for (const olderMessage of olderMessages) {
          if (olderMessage.type === "image") {
            removeChatImage(olderMessage.imageUrl);
          }
        }
      }

      const messageForClient = {
        ...message,
        userName: user.firstName,
        initial: user.firstName.charAt(0).toUpperCase() || "?",
        avatarUrl: user.avatarUrl,
        isAdmin: group.adminIds.includes(user.id),
      };

      io.to(`room:${room.id}`).emit("message:new", messageForClient);

      return res.status(201).json({
        valid: true,
        message: "Chat image sent.",
        chatMessage: messageForClient,
      });
    },
  );
}

export { messageRoutes };
