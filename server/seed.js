import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { closeDatabase, connectDatabase, getDatabase } from "./database.js";

const currentFolder = path.dirname(fileURLToPath(import.meta.url));
const seedFile = path.join(currentFolder, "data", "fabulari.json");
const useE2eData = process.argv.includes("--e2e");
const databaseName = useE2eData ? "fabulari_e2e" : "fabulari";

// Keep the demonstration data readable in JSON before inserting it into MongoDB.
function loadSeedData() {
  const fileContents = fs.readFileSync(seedFile, "utf8");
  return JSON.parse(fileContents);
}

// Replace collections so repeated seeds produce the same starting state.
async function seedDatabase() {
  try {
    await connectDatabase(databaseName);

    const database = getDatabase();

    if (useE2eData && database.databaseName !== "fabulari_e2e") {
      throw new Error("Refusing to replace data outside the E2E database.");
    }

    const data = loadSeedData();

    if (useE2eData) {
      // Browser tests use one known password without changing the demonstration seed file.
      const passwordHash = await bcrypt.hash("e2e-password", 10);

      for (const user of data.users) {
        user.passwordHash = passwordHash;
      }
    }

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
