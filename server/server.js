import http from "node:http";
import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { connectDatabase, getDatabase } from "./database.js";
import { createIndexes } from "./indexes.js";
import { routes } from "./routes.js";
import { connectSockets } from "./socket.js";

const app = express();
const server = http.createServer(app);
const port = 3000;

const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

routes(app);
connectSockets(io);

async function startServer() {
  try {
    // Do not accept requests until MongoDB and its indexes are ready.
    await connectDatabase();
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
