import bcrypt from "bcryptjs";
import { loadData, saveData } from "../data.js";
import {
  ensureText,
  getUserDetails,
  validateUserDetails,
  findAccountConflict,
  createUser,
  safeUser,
  addAuditLog,
} from "./route-helpers.js";

function accountRoutes(app) {
  app.get("/api/bootstrap-status", (req, res) => {
    const data = loadData();

    return res.status(200).json({
      valid: true,
      setupRequired: data.users.length === 0,
    });
  });

  app.post("/api/bootstrap", async (req, res) => {
    const data = loadData();

    // Setup is only available before any account has been created.
    if (data.users.length > 0) {
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

    const conflictError = findAccountConflict(data, details);
    if (conflictError) {
      return res.status(409).json({ valid: false, message: conflictError });
    }

    const user = await createUser(details, "superAdmin");
    data.users.push(user);
    addAuditLog(data, {
      actorId: user.id,
      actionType: "accountCreated",
      entityType: "user",
      entityId: user.id,
      summary: "Created the first Super Admin account.",
    });
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: "Super Admin account created.",
      user: safeUser(user),
    });
  });

  app.post("/api/register", async (req, res) => {
    const data = loadData();

    // A user account cannot take the place of the required first Super Admin.
    if (data.users.length === 0) {
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

    const conflictError = findAccountConflict(data, details);
    if (conflictError) {
      return res.status(409).json({ valid: false, message: conflictError });
    }

    const user = await createUser(details, "user");
    data.users.push(user);
    addAuditLog(data, {
      actorId: user.id,
      actionType: "accountCreated",
      entityType: "user",
      entityId: user.id,
      summary: `Created the ${user.username} account.`,
    });
    saveData(data);

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

    const data = loadData();
    const user = data.users.find((item) => {
      return item.username.toLowerCase() === username.toLowerCase();
    });

    // The same response is used for an unknown username or incorrect password.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        valid: false,
        message: "Username or password is incorrect.",
      });
    }

    return res.status(200).json({
      valid: true,
      message: "Login successful.",
      user: safeUser(user),
    });
  });
}

export { accountRoutes };
