import cors from "cors";
import express from "express";
import { routes } from "./routes.js";
import { uploadsFolder } from "./upload.js";

// Configure the Express application without starting the HTTP server.
function configureApp(app, io) {
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(uploadsFolder));

  routes(app, io);
}

export { configureApp };
