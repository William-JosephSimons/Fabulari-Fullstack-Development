import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getBearerToken } from "../authentication.js";
import { getDatabase } from "../database.js";
import {
  ensureText,
  getUserDetails,
  validateUserDetails,
  findAccountConflict,
  createUser,
  safeUser,
  createAuditLog,
} from "./route-helpers.js";

function accountRoutes(app) {
  app.get("/api/bootstrap-status", async (req, res) => {
    const database = getDatabase();
    const userCount = await database.collection("users").countDocuments();

    return res.status(200).json({
      valid: true,
      setupRequired: userCount === 0,
    });
  });

  app.post("/api/bootstrap", async (req, res) => {
    const database = getDatabase();
    const users = database.collection("users");

    // Setup is only available before any account has been created.
    if ((await users.countDocuments()) > 0) {
      return res.status(409).json({
        valid: false,
        message: "Super Admin setup has already been completed.",
      });
    }

    const details = getUserDetails(req.body);
    const validationError = validateUserDetails(details);
    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const conflictError = await findAccountConflict(database, details);
    if (conflictError) {
      return res.status(409).json({ valid: false, message: conflictError });
    }

    const user = await createUser(details, "superAdmin");
    await users.insertOne(user);
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: user.id,
        actionType: "accountCreated",
        entityType: "user",
        entityId: user.id,
        summary: "Created the first Super Admin account.",
      }),
    );

    return res.status(201).json({
      valid: true,
      message: "Super Admin account created.",
      user: safeUser(user),
    });
  });

  app.post("/api/register", async (req, res) => {
    const database = getDatabase();
    const users = database.collection("users");

    // A user account cannot take the place of the required first Super Admin.
    if ((await users.countDocuments()) === 0) {
      return res.status(409).json({
        valid: false,
        message: "Super Admin setup must be completed first.",
      });
    }

    const details = getUserDetails(req.body);
    const validationError = validateUserDetails(details);
    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const conflictError = await findAccountConflict(database, details);
    if (conflictError) {
      return res.status(409).json({ valid: false, message: conflictError });
    }

    const user = await createUser(details, "user");
    await users.insertOne(user);
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: user.id,
        actionType: "accountCreated",
        entityType: "user",
        entityId: user.id,
        summary: `Created the ${user.username} account.`,
      }),
    );

    return res.status(201).json({
      valid: true,
      message: "Account created successfully.",
      user: safeUser(user),
    });
  });

  app.post("/api/login", async (req, res) => {
    const username = ensureText(req.body?.username);
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!username || !password) {
      return res.status(400).json({
        valid: false,
        message: "Username and password are required.",
      });
    }

    const database = getDatabase();
    const user = await database.collection("users").findOne(
      { username },
      { collation: { locale: "en", strength: 2 } },
    );

    // The same response is used for an unknown username or incorrect password.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        valid: false,
        message: "Username or password is incorrect.",
      });
    }

    const token = randomBytes(32).toString("hex");
    await database.collection("authSessions").insertOne({
      token,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({
      valid: true,
      message: "Login successful.",
      user: safeUser(user),
      token,
    });
  });

  app.post("/api/logout", async (req, res) => {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        valid: false,
        message: "A login session is required.",
      });
    }

    const database = getDatabase();
    const result = await database
      .collection("authSessions")
      .deleteOne({ token });

    if (result.deletedCount === 0) {
      return res.status(401).json({
        valid: false,
        message: "That login session is no longer valid.",
      });
    }

    return res.status(200).json({
      valid: true,
      message: "Logout successful.",
    });
  });

  app.get("/api/session", async (req, res) => {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        valid: false,
        message: "A login session is required.",
      });
    }

    const database = getDatabase();
    const sessions = database.collection("authSessions");
    const session = await sessions.findOne({ token });

    if (!session) {
      return res.status(401).json({
        valid: false,
        message: "That login session is no longer valid.",
      });
    }

    const user = await database
      .collection("users")
      .findOne({ id: session.userId });

    if (!user) {
      // Remove a session if its account no longer exists.
      await sessions.deleteOne({ token });
      return res.status(401).json({
        valid: false,
        message: "That login session is no longer valid.",
      });
    }

    return res.status(200).json({
      valid: true,
      user: safeUser(user),
    });
  });
}

export { accountRoutes };
