import { randomUUID } from "node:crypto";
import { getDatabase } from "./database.js";
import { ensureText, meetsMinimumAge } from "./routes/route-helpers.js";

function getParticipantDetails(connection) {
  return {
    userId: connection.userId,
    name: connection.name,
    initial: connection.initial,
    avatarUrl: connection.avatarUrl,
    isAdmin: connection.isAdmin,
  };
}

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
  delete socket.data.userId;
  console.log(`Socket ${socket.id} left room ${connection.roomId}.`);
}

function connectSockets(io) {
  // Presence resets whenever the server restarts because it represents live connections.
  const connections = [];

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("room:join", async (details = {}) => {
      const roomId = ensureText(details.roomId);
      const userId = ensureText(details.userId);

      if (!roomId || !userId) {
        socket.emit("socket:error", {
          message: "A room and current user are required.",
        });
        return;
      }

      try {
        const database = getDatabase();
        const user = await database.collection("users").findOne({ id: userId });
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

    socket.on("room:leave", (details = {}) => {
      const roomId = ensureText(details.roomId);

      if (!roomId || socket.data.roomId !== roomId) {
        return;
      }

      leaveCurrentRoom(io, socket, connections);
    });

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
        const group = room
          ? await database.collection("groups").findOne({ id: room.groupId })
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
      } catch (error) {
        console.error("Unable to send the chat message:", error.message);
        socket.emit("socket:error", {
          message: "The message could not be sent. Please try again.",
        });
      }
    });

    socket.on("disconnect", () => {
      leaveCurrentRoom(io, socket, connections);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

export { connectSockets };
