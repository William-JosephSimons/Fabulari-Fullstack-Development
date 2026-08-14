import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { loadData, saveData } from "./data.js";

function ensureText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getUserDetails(body = {}) {
  return {
    username: ensureText(body.username),
    email: ensureText(body.email).toLowerCase(),
    firstName: ensureText(body.firstName),
    lastName: ensureText(body.lastName),
    age: Number(body.age),
    // Passwords are not trimmed because leading/trailing spaces may be intentionally included.
    password: typeof body.password === "string" ? body.password : "",
  };
}

function validateUserDetails(details) {
  if (
    !details.username ||
    !details.email ||
    !details.firstName ||
    !details.lastName ||
    !details.password
  ) {
    return "All account fields are required.";
  }

  if (details.username.length < 3 || details.username.length > 30) {
    return "Username must be between 3 and 30 characters.";
  }

  if (!details.email.includes("@") || !details.email.includes(".")) {
    return "Enter a valid email address.";
  }

  if (!Number.isInteger(details.age) || details.age < 1 || details.age > 120) {
    return "Age must be a whole number between 1 and 120.";
  }

  if (details.password.length < 8) {
    return "Password must contain at least 8 characters.";
  }

  return null;
}

function findAccountConflict(data, details) {
  const usernameTaken = data.users.some((user) => {
    return user.username.toLowerCase() === details.username.toLowerCase();
  });

  if (usernameTaken) {
    return "That username is already in use.";
  }

  const emailTaken = data.users.some((user) => user.email === details.email);
  if (emailTaken) {
    return "That email is already registered.";
  }

  const emailBanned = data.systemBans.some((ban) => {
    return ban.normalizedEmail === details.email;
  });

  if (emailBanned) {
    return "That email cannot be used to register.";
  }

  return null;
}

async function createUser(details, systemRole) {
  const now = new Date().toISOString();

  return {
    // A UUID remains unique even when earlier user accounts have been deleted.
    id: `user-${randomUUID()}`,
    username: details.username,
    email: details.email,
    firstName: details.firstName,
    lastName: details.lastName,
    age: details.age,
    passwordHash: await bcrypt.hash(details.password, 10),
    avatarUrl: null,
    systemRole,
    createdAt: now,
    updatedAt: now,
  };
}

function safeUser(user) {
  // Password hashes are never sent over the network
  const { passwordHash, ...userSafe } = user;
  return userSafe;
}

function routes(app) {
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

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
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: "Super Admin account created.",
      user: safeUser(user),
    });
  });

  app.post("/api/register", async (req, res) => {
    const data = loadData();

    // A normal user cannot take the place of the required first Super Admin.
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

export { routes };
