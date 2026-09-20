import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  getBearerToken,
  requireLogin,
  loginRequiredMiddleware,
} from "../authentication.js";
import { getDatabase } from "../database.js";
import { removeAvatar, removeChatImage, uploadAvatar } from "../upload.js";
import {
  ensureText,
  getUserDetails,
  validateUserDetails,
  getProfileDetails,
  validateProfileDetails,
  findAccountConflict,
  createUser,
  safeUser,
  createAuditLog,
} from "./route-helpers.js";

// Register setup, login, session and private-profile routes.
function accountRoutes(app, io) {
  // Tell Angular whether the first Super Admin still needs to be created.
  app.get("/api/bootstrap-status", async (req, res) => {
    const database = getDatabase();
    const userCount = await database.collection("users").countDocuments();

    return res.status(200).json({
      valid: true,
      setupRequired: userCount === 0,
    });
  });

  // Create the first and only Super Admin account.
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

  // Register an ordinary account after first-run setup is complete.
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

  // Check credentials and create an opaque MongoDB session.
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
    const user = await database
      .collection("users")
      .findOne({ username }, { collation: { locale: "en", strength: 2 } });

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

  // Delete the session represented by the bearer token.
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

  // Validate a stored session and return its current safe user.
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

  // Return the authenticated user's private profile.
  app.get("/api/profile", async (req, res) => {
    const user = await requireLogin(req, res);

    if (!user) {
      return;
    }

    return res.status(200).json({
      valid: true,
      user: safeUser(user),
    });
  });

  // Save editable profile fields while keeping the email fixed.
  app.put("/api/profile", async (req, res) => {
    const user = await requireLogin(req, res);

    if (!user) {
      return;
    }

    const requestedEmail = ensureText(req.body?.email).toLowerCase();
    if (requestedEmail && requestedEmail !== user.email) {
      return res.status(400).json({
        valid: false,
        message: "Email cannot be changed.",
      });
    }

    const details = getProfileDetails(req.body);
    const validationError = validateProfileDetails(details);

    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const database = getDatabase();
    const usernameTaken = await database.collection("users").findOne(
      {
        id: { $ne: user.id },
        username: details.username,
      },
      { collation: { locale: "en", strength: 2 } },
    );

    if (usernameTaken) {
      return res.status(409).json({
        valid: false,
        message: "That username is already in use.",
      });
    }

    const updatedAt = new Date().toISOString();
    await database.collection("users").updateOne(
      { id: user.id },
      {
        $set: {
          username: details.username,
          firstName: details.firstName,
          lastName: details.lastName,
          birthdate: details.birthdate,
          updatedAt,
        },
      },
    );
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: user.id,
        actionType: "profileUpdated",
        entityType: "user",
        entityId: user.id,
        summary: `Updated the ${details.username} profile.`,
        createdAt: updatedAt,
      }),
    );

    const updatedUser = {
      ...user,
      ...details,
      updatedAt,
    };

    return res.status(200).json({
      valid: true,
      message: "Profile changes saved.",
      user: safeUser(updatedUser),
    });
  });

  // Verify the current password before storing a new hash.
  app.put("/api/profile/password", async (req, res) => {
    const user = await requireLogin(req, res);

    if (!user) {
      return;
    }

    // Password spaces are preserved because they may be intentional.
    const currentPassword =
      typeof req.body?.currentPassword === "string" ?
        req.body.currentPassword
      : "";
    const newPassword =
      typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        valid: false,
        message: "The current and new passwords are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        valid: false,
        message: "The new password must contain at least 8 characters.",
      });
    }

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({
        valid: false,
        message: "The current password is incorrect.",
      });
    }

    const database = getDatabase();
    const updatedAt = new Date().toISOString();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await database.collection("users").updateOne(
      { id: user.id },
      {
        $set: {
          passwordHash,
          updatedAt,
        },
      },
    );
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: user.id,
        actionType: "passwordChanged",
        entityType: "user",
        entityId: user.id,
        summary: `Changed the password for ${user.username}.`,
        createdAt: updatedAt,
      }),
    );

    return res.status(200).json({
      valid: true,
      message: "Password changed successfully.",
    });
  });

  // Delete the current user's account and its related private data.
  app.delete("/api/profile", async (req, res) => {
    const user = await requireLogin(req, res);

    if (!user) {
      return;
    }

    if (user.systemRole === "superAdmin") {
      return res.status(403).json({
        valid: false,
        message: "The Super Admin account cannot be deleted.",
      });
    }

    const database = getDatabase();
    const administeredGroups = await database
      .collection("groups")
      .find({ adminIds: user.id }, { projection: { _id: 0 } })
      .toArray();
    const groupWithoutReplacement = administeredGroups.find((group) => {
      return group.adminIds.length === 1;
    });

    if (groupWithoutReplacement) {
      return res.status(409).json({
        valid: false,
        message: `Promote another administrator in ${groupWithoutReplacement.title} before deleting your account.`,
      });
    }

    const affectedGroups = await database
      .collection("groups")
      .find(
        {
          $or: [{ memberIds: user.id }, { adminIds: user.id }],
        },
        { projection: { _id: 0 } },
      )
      .toArray();
    const userMessages = await database
      .collection("messages")
      .find({ userId: user.id })
      .toArray();
    const deletedAt = new Date().toISOString();

    for (const group of affectedGroups) {
      group.memberIds = group.memberIds.filter((userId) => userId !== user.id);
      group.adminIds = group.adminIds.filter((userId) => userId !== user.id);

      await database.collection("groups").updateOne(
        { id: group.id },
        {
          $set: {
            memberIds: group.memberIds,
            adminIds: group.adminIds,
            updatedAt: deletedAt,
          },
        },
      );
    }

    await database.collection("requests").deleteMany({
      $or: [{ requesterId: user.id }, { targetUserId: user.id }],
    });
    await database
      .collection("groupBans")
      .deleteMany({ bannedUserId: user.id });
    await database.collection("messages").deleteMany({ userId: user.id });
    await database.collection("authSessions").deleteMany({ userId: user.id });
    await database.collection("users").deleteOne({ id: user.id });
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: user.id,
        actionType: "accountDeleted",
        entityType: "user",
        entityId: user.id,
        summary: `${user.username} deleted their account.`,
        createdAt: deletedAt,
      }),
    );

    removeAvatar(user.avatarUrl);

    for (const message of userMessages) {
      if (message.type === "image") {
        removeChatImage(message.imageUrl);
      }

      io.to(`room:${message.roomId}`).emit("message:deleted", {
        roomId: message.roomId,
        messageId: message.id,
      });
    }

    // Close every live-chat connection belonging to the deleted account.
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.userId === user.id) {
        socket.disconnect(true);
      }
    }

    return res.status(200).json({
      valid: true,
      message: "Your account has been deleted.",
    });
  });

  // Replace the authenticated user's profile image.
  app.post(
    "/api/profile/avatar",
    // login middleware required here because authentication is needed before image upload
    loginRequiredMiddleware,
    uploadAvatar,
    async (req, res) => {
      const user = req.currentUser;

      if (!req.file) {
        return res.status(400).json({
          valid: false,
          message: "Choose a PNG, JPEG or GIF profile image.",
        });
      }

      if (req.file.size === 0) {
        removeAvatar(req.file.filename);
        return res.status(400).json({
          valid: false,
          message: "The selected profile image is empty.",
        });
      }

      const database = getDatabase();
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const updatedAt = new Date().toISOString();

      await database.collection("users").updateOne(
        { id: user.id },
        {
          $set: {
            avatarUrl,
            updatedAt,
          },
        },
      );

      // Delete the previous file only after MongoDB accepts the replacement.
      removeAvatar(user.avatarUrl);
      await database.collection("auditLogs").insertOne(
        createAuditLog({
          actorId: user.id,
          actionType: "profileImageUpdated",
          entityType: "user",
          entityId: user.id,
          summary: `Updated the profile image for ${user.username}.`,
          createdAt: updatedAt,
        }),
      );

      const updatedUser = {
        ...user,
        avatarUrl,
        updatedAt,
      };

      return res.status(200).json({
        valid: true,
        message: "Profile image updated.",
        user: safeUser(updatedUser),
      });
    },
  );
}

export { accountRoutes };
