import { randomUUID } from "node:crypto";
import { getUserFromToken } from "./authentication.js";
import { getDatabase } from "./database.js";
import { ensureText, meetsMinimumAge } from "./routes/route-helpers.js";
import { removeChatImage } from "./upload.js";

// Remove connection-only fields before sending a participant to browsers.
function getParticipantDetails(connection) {
  return {
    userId: connection.userId,
    name: connection.name,
    initial: connection.initial,
    avatarUrl: connection.avatarUrl,
    isAdmin: connection.isAdmin,
  };
}

// Show one participant per account even when that account has several tabs open.
function getRoomParticipants(connections, roomId) {
  const participants = [];

  for (const connection of connections) {
    const alreadyAdded = participants.some(
      (item) => item.userId === connection.userId,
    );

    if (connection.roomId === roomId && !alreadyAdded) {
      participants.push(getParticipantDetails(connection));
    }
  }

  return participants;
}

// Remove one socket and announce a leave only after that user's final tab exits.
function leaveCurrentRoom(io, socket, connections) {
  const connectionIndex = connections.findIndex(
    (item) => item.socketId === socket.id,
  );

  if (connectionIndex === -1) {
    return;
  }

  const connection = connections[connectionIndex];
  connections.splice(connectionIndex, 1);
  socket.leave(`room:${connection.roomId}`);

  const userStillConnected = connections.some((item) => {
    return (
      item.roomId === connection.roomId && item.userId === connection.userId
    );
  });

  if (!userStillConnected) {
    io.to(`room:${connection.roomId}`).emit("presence:left", {
      roomId: connection.roomId,
      participant: getParticipantDetails(connection),
    });
  }

  io.to(`room:${connection.roomId}`).emit("presence:state", {
    roomId: connection.roomId,
    participants: getRoomParticipants(connections, connection.roomId),
  });

  delete socket.data.roomId;
  console.log(`Socket ${socket.id} left room ${connection.roomId}.`);
}

// Register socket authentication, room, presence and text-message handlers.
function connectSockets(io) {
  // Presence resets whenever the server restarts because it represents live connections.
  const connections = [];

  // Socket.IO runs this check before allowing the connection event below.
  // Authenticate the token before allowing any live-chat event handlers.
  io.use(async (socket, next) => {
    try {
      const token = ensureText(socket.handshake.auth.token);
      const user = await getUserFromToken(token);

      if (!user) {
        next(new Error("A valid login session is required for live chat."));
        return;
      }

      socket.data.userId = user.id;
      next();
    } catch (error) {
      console.error("Unable to authenticate the socket:", error.message);
      next(new Error("Live chat authentication could not be completed."));
    }
  });

  // Register room and message handlers for each authenticated connection.
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Check current MongoDB access before joining one Socket.IO room.
    socket.on("room:join", async (details = {}) => {
      const roomId = ensureText(details.roomId);

      if (!roomId) {
        socket.emit("socket:error", {
          message: "A room is required.",
        });
        return;
      }

      try {
        const database = getDatabase();
        const user = await database
          .collection("users")
          .findOne({ id: socket.data.userId });
        const room = await database.collection("rooms").findOne({ id: roomId });

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

        const group = await database
          .collection("groups")
          .findOne({ id: room.groupId });

        if (!group) {
          socket.emit("socket:error", {
            message: "The room's group could not be found.",
          });
          return;
        }

        if (
          !group.memberIds.includes(user.id) ||
          !meetsMinimumAge(user, group.minimumAge)
        ) {
          socket.emit("socket:error", {
            message: "You are not eligible to enter this chat room.",
          });
          return;
        }

        // Ignore duplicate join events for the same user and room.
        if (socket.data.roomId === room.id && socket.data.userId === user.id) {
          return;
        }

        // A socket should receive live events from only one room at a time.
        if (socket.data.roomId) {
          leaveCurrentRoom(io, socket, connections);
        }

        const userAlreadyPresent = connections.some((item) => {
          return item.roomId === room.id && item.userId === user.id;
        });
        const participant = {
          socketId: socket.id,
          roomId: room.id,
          userId: user.id,
          name: user.firstName,
          initial: user.firstName.charAt(0).toUpperCase() || "?",
          avatarUrl: user.avatarUrl,
          isAdmin: group.adminIds.includes(user.id),
        };

        socket.join(`room:${room.id}`);
        socket.data.userId = user.id;
        socket.data.roomId = room.id;
        connections.push(participant);

        if (!userAlreadyPresent) {
          socket.to(`room:${room.id}`).emit("presence:joined", {
            roomId: room.id,
            participant: getParticipantDetails(participant),
          });
        }

        io.to(`room:${room.id}`).emit("presence:state", {
          roomId: room.id,
          participants: getRoomParticipants(connections, room.id),
        });

        console.log(`${user.username} joined ${room.name}.`);
      } catch (error) {
        console.error("Unable to join the chat room:", error.message);
        socket.emit("socket:error", {
          message: "The chat room could not be joined. Please try again.",
        });
      }
    });

    // Leave only when the request matches the socket's current room.
    socket.on("room:leave", (details = {}) => {
      const roomId = ensureText(details.roomId);

      if (!roomId || socket.data.roomId !== roomId) {
        return;
      }

      leaveCurrentRoom(io, socket, connections);
    });

    // Validate, retain and broadcast one text message.
    socket.on("message:send", async (details = {}) => {
      const roomId = ensureText(details.roomId);
      const text = ensureText(details.text);

      if (!text) {
        socket.emit("socket:error", {
          message: "Enter a message before sending.",
        });
        return;
      }

      if (text.length > 2000) {
        socket.emit("socket:error", {
          message: "Messages cannot contain more than 2,000 characters.",
        });
        return;
      }

      if (!roomId || socket.data.roomId !== roomId || !socket.data.userId) {
        socket.emit("socket:error", {
          message: "Join this room before sending a message.",
        });
        return;
      }

      try {
        const database = getDatabase();
        const user = await database
          .collection("users")
          .findOne({ id: socket.data.userId });
        const room = await database.collection("rooms").findOne({ id: roomId });
        const group =
          room ?
            await database.collection("groups").findOne({ id: room.groupId })
          : null;

        // Membership may have changed since the socket first joined the room.
        if (
          !user ||
          !room ||
          !group ||
          user.systemRole !== "user" ||
          !group.memberIds.includes(user.id) ||
          !meetsMinimumAge(user, group.minimumAge)
        ) {
          socket.emit("socket:error", {
            message:
              "You are no longer eligible to send messages in this room.",
          });
          return;
        }

        const message = {
          id: `message-${randomUUID()}`,
          roomId: room.id,
          type: "text",
          text,
          userId: user.id,
          createdAt: new Date().toISOString(),
        };

        const messages = database.collection("messages");
        await messages.insertOne({ ...message });

        // retain only the newest five messages in each room.
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

        io.to(`room:${room.id}`).emit("message:new", {
          ...message,
          userName: user.firstName,
          initial: user.firstName.charAt(0).toUpperCase() || "?",
          avatarUrl: user.avatarUrl,
          isAdmin: group.adminIds.includes(user.id),
        });
      } catch (error) {
        console.error("Unable to send the chat message:", error.message);
        socket.emit("socket:error", {
          message: "The message could not be sent. Please try again.",
        });
      }
    });

    // Remove this connection from presence after any kind of disconnect.
    socket.on("disconnect", () => {
      leaveCurrentRoom(io, socket, connections);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

export { connectSockets };
