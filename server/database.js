import { MongoClient } from "mongodb";

const mongoUrl = "mongodb://localhost:27017";
const databaseName = "fabulari";
const client = new MongoClient(mongoUrl);
let database;

async function connectDatabase() {
  await client.connect();
  database = client.db(databaseName);
  await database.command({ ping: 1 });
  console.log(`Connected to the ${databaseName} MongoDB database`);
}

function getDatabase() {
  if (!database) {
    throw new Error("The MongoDB database has not been connected.");
  }

  return database;
}

async function closeDatabase() {
  await client.close();
  database = undefined;
}

export { connectDatabase, getDatabase, closeDatabase };
