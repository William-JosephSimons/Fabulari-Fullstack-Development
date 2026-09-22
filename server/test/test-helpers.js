import express from "express";
import { configureApp } from "../app.js";
import { closeDatabase, connectDatabase, getDatabase } from "../database.js";
import { createIndexes } from "../indexes.js";

const testDatabaseName = "fabulari_test";

// Record room broadcasts made by routes without starting a real Socket.IO server.
function createTestIo() {
  const emittedEvents = [];

  return {
    emittedEvents,
    sockets: {
      sockets: new Map(),
    },
    // Return the small part of a Socket.IO room broadcaster used by the routes.
    to(roomName) {
      return {
        // Save the event so a test can check what the route broadcast.
        emit(eventName, data) {
          emittedEvents.push({ roomName, eventName, data });
        },
      };
    },
  };
}

// Create an Express application that integration tests can call without using a port.
function createTestApp() {
  const app = express();
  const io = createTestIo();

  configureApp(app, io);

  return { app, io };
}

// Connect tests to their own database and apply the same indexes as development.
async function connectTestDatabase() {
  await connectDatabase(testDatabaseName);
  await createIndexes(getDatabase());
}

// Remove test documents while keeping indexes ready for the next test.
async function clearTestDatabase() {
  const database = getDatabase();

  if (database.databaseName !== testDatabaseName) {
    throw new Error(
      "Refusing to clear a database that is not the test database.",
    );
  }

  const collections = await database.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

// Clear test data and close MongoDB after the integration test run.
async function closeTestDatabase() {
  await clearTestDatabase();
  await closeDatabase();
}

export {
  clearTestDatabase,
  closeTestDatabase,
  connectTestDatabase,
  createTestApp,
};
