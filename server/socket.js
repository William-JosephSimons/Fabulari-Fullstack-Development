import { randomUUID } from "node:crypto";
import { loadData } from "./data.js";
import { ensureText } from "./routes/route-helpers.js";

function connectSockets(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("room:join", (details = {}) => {
      const roomId = ensureText(details.roomId);
      const userId = ensureText(details.userId);

      if (!roomId || !userId) {
        socket.emit("socket:error", {
          message: "A room and current user are required.",
        });
        return;
      }

      const data = loadData();
      const user = data.users.find((item) => item.id === userId);
      const room = data.rooms.find((item) => item.id === roomId);

      if (!user) {
        socket.emit("socket:error", {
          message: "The current user could not be found.",
        });
        return;
      }

      if (user.systemRole !== "user") {
        socket.emit("socket:error", {
          message: "The Super Admin cannot join chat rooms.",
        });
        return;
      }

      if (!room) {
        socket.emit("socket:error", {
          message: "That chat room could not be found.",
        });
        return;
      }

      const group = data.groups.find((item) => item.id === room.groupId);

      if (!group) {
        socket.emit("socket:error", {
          message: "The room's group could not be found.",
        });
        return;
      }

      if (!group.memberIds.includes(user.id) || user.age < group.minimumAge) {
        socket.emit("socket:error", {
          message: "You are not eligible to enter this chat room.",
        });
        return;
      }

      // A socket should receive live events from only one room at a time.
      if (socket.data.roomId) {
        socket.leave(`room:${socket.data.roomId}`);
      }

      socket.join(`room:${room.id}`);
      socket.data.userId = user.id;
      socket.data.roomId = room.id;
      console.log(`${user.username} joined ${room.name}.`);
    });

    socket.on("room:leave", (details = {}) => {
      const roomId = ensureText(details.roomId);

      if (!roomId) {
        return;
      }

      socket.leave(`room:${roomId}`);

      if (socket.data.roomId === roomId) {
        delete socket.data.roomId;
        delete socket.data.userId;
      }

      console.log(`Socket ${socket.id} left room ${roomId}.`);
    });

    socket.on("message:send", (details = {}) => {
      const roomId = ensureText(details.roomId);
      const text = ensureText(details.text);

      if (!text) {
        socket.emit("socket:error", { message: "Enter a message before sending." });
        return;
      }

      if (text.length > 2000) {
        socket.emit("socket:error", {
          message: "Messages cannot contain more than 2,000 characters.",
        });
        return;
      }

      if (!roomId || socket.data.roomId !== roomId || !socket.data.userId) {
        socket.emit("socket:error", { message: "Join this room before sending a message." });
        return;
      }

      const data = loadData();
      const user = data.users.find((item) => item.id === socket.data.userId);
      const room = data.rooms.find((item) => item.id === roomId);
      const group = data.groups.find((item) => item.id === room?.groupId);

      // Membership may have changed since the socket first joined the room.
      if (
        !user ||
        !room ||
        !group ||
        user.systemRole !== "user" ||
        !group.memberIds.includes(user.id) ||
        user.age < group.minimumAge
      ) {
        socket.emit("socket:error", {
          message: "You are no longer eligible to send messages in this room.",
        });
        return;
      }

      const message = {
        id: `message-${randomUUID()}`,
        roomId: room.id,
        type: "text",
        text,
        userId: user.id,
        userName: user.firstName,
        initial: user.firstName.charAt(0).toUpperCase() || "?",
        isAdmin: group.adminIds.includes(user.id),
        createdAt: new Date().toISOString(),
      };

      io.to(`room:${room.id}`).emit("message:new", message);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

export { connectSockets };
