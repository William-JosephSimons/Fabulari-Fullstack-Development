import { MongoClient } from "mongodb";

const mongoUrl = "mongodb://localhost:27017";
const defaultDatabaseName = "fabulari";
const client = new MongoClient(mongoUrl);
let database;

// Open one shared connection and select the requested database.
async function connectDatabase(databaseName = defaultDatabaseName) {
  await client.connect();
  database = client.db(databaseName);
  await database.command({ ping: 1 });
  console.log(`Connected to the ${databaseName} MongoDB database`);
}

// Route modules reuse this database.
function getDatabase() {
  if (!database) {
    throw new Error("The MongoDB database has not been connected.");
  }

  return database;
}

// Close the shared client after a seed or test run finishes.
async function closeDatabase() {
  await client.close();
  database = undefined;
}

export { connectDatabase, getDatabase, closeDatabase };
