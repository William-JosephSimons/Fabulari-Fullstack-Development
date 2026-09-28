import http from "node:http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { configureApp } from "./app.js";
import { connectDatabase, getDatabase } from "./database.js";
import { createIndexes } from "./indexes.js";
import { connectSockets } from "./socket.js";

const app = express();
const server = http.createServer(app);
const port = 3000;
const databaseName = process.argv.includes("--e2e") ? "fabulari_e2e" : "fabulari";

const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
  },
});

configureApp(app, io);
connectSockets(io);

// Connect MongoDB and create its indexes before accepting requests.
async function startServer() {
  try {
    // Do not accept requests until MongoDB and its indexes are ready.
    await connectDatabase(databaseName);
    await createIndexes(getDatabase());

    server.listen(port, () => {
      console.log(`Fabulari server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Unable to connect to MongoDB:", error.message);
    process.exitCode = 1;
  }
}

startServer();
