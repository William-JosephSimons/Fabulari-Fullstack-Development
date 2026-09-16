import { requireLogin } from "../authentication.js";
import { getDatabase } from "../database.js";
import { meetsMinimumAge } from "./route-helpers.js";

function messageRoutes(app) {
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
}

export { messageRoutes };
