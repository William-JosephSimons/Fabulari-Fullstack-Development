import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDatabase, connectDatabase, getDatabase } from "./database.js";

const currentFolder = path.dirname(fileURLToPath(import.meta.url));
const seedFile = path.join(currentFolder, "data", "fabulari.json");

function loadSeedData() {
  const fileContents = fs.readFileSync(seedFile, "utf8");
  return JSON.parse(fileContents);
}

async function seedDatabase() {
  try {
    await connectDatabase();

    const database = getDatabase();
    const data = loadSeedData();
    const collectionData = {
      users: data.users,
      groups: data.groups,
      rooms: data.rooms,
      requests: data.requests,
      groupBans: data.groupBans,
      systemBans: data.systemBans,
      auditLogs: data.auditLogs,
      messages: data.messages,
      // A fresh demonstration database should not contain old login sessions.
      authSessions: [],
    };
    const existingCollections = await database.listCollections().toArray();
    const existingCollectionNames = existingCollections.map((item) => item.name);

    for (const [collectionName, documents] of Object.entries(collectionData)) {
      // Create empty collections too, so they can be inspected in MongoDB Compass.
      if (!existingCollectionNames.includes(collectionName)) {
        await database.createCollection(collectionName);
      }

      const collection = database.collection(collectionName);
      await collection.deleteMany({});

      if (documents.length > 0) {
        await collection.insertMany(documents);
      }

      console.log(`Seeded ${documents.length} ${collectionName} documents`);
    }

    console.log("Fabulari demonstration data is ready");
  } catch (error) {
    console.error("Unable to seed the Fabulari database:", error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

seedDatabase();
