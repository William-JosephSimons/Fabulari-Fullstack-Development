import { closeDatabase, connectDatabase, getDatabase } from "./database.js";

const caseInsensitive = { locale: "en", strength: 2 };

async function createIndexes() {
  try {
    await connectDatabase();
    const database = getDatabase();

    await database.collection("users").createIndex({ id: 1 }, { unique: true });
    await database
      .collection("users")
      .createIndex({ username: 1 }, { unique: true, collation: caseInsensitive });
    await database
      .collection("users")
      .createIndex({ email: 1 }, { unique: true });

    await database.collection("groups").createIndex({ id: 1 }, { unique: true });
    await database
      .collection("groups")
      .createIndex({ title: 1 }, { unique: true, collation: caseInsensitive });

    await database.collection("rooms").createIndex({ id: 1 }, { unique: true });
    await database.collection("rooms").createIndex(
      { groupId: 1, name: 1 },
      { unique: true, collation: caseInsensitive },
    );

    await database.collection("requests").createIndex({ id: 1 }, { unique: true });
    await database
      .collection("requests")
      .createIndex({ requesterId: 1, createdAt: -1 });
    await database
      .collection("requests")
      .createIndex({ status: 1, groupId: 1, createdAt: -1 });

    await database
      .collection("groupBans")
      .createIndex({ id: 1 }, { unique: true });
    await database
      .collection("groupBans")
      .createIndex({ groupId: 1, bannedUserId: 1 }, { unique: true });

    await database
      .collection("systemBans")
      .createIndex({ id: 1 }, { unique: true });
    await database
      .collection("systemBans")
      .createIndex({ normalizedEmail: 1 }, { unique: true });

    await database
      .collection("auditLogs")
      .createIndex({ id: 1 }, { unique: true });
    await database
      .collection("auditLogs")
      .createIndex({ actionType: 1, createdAt: -1 });

    await database
      .collection("messages")
      .createIndex({ id: 1 }, { unique: true });
    await database
      .collection("messages")
      .createIndex({ roomId: 1, createdAt: -1 });

    await database
      .collection("authSessions")
      .createIndex({ token: 1 }, { unique: true });
    await database.collection("authSessions").createIndex({ userId: 1 });

    console.log("Fabulari MongoDB indexes are ready");
  } catch (error) {
    console.error("Unable to create the MongoDB indexes:", error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

createIndexes();
