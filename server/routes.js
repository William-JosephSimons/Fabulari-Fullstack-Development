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

function getGroupRequestDetails(body = {}) {
  return {
    requesterId: ensureText(body.requesterId),
    title: ensureText(body.title),
    description: ensureText(body.description),
    minimumAge: Number(body.minimumAge),
    colour: ensureText(body.colour).toUpperCase(),
    reason: ensureText(body.reason),
  };
}

function validateGroupRequest(details) {
  if (
    !details.requesterId ||
    !details.title ||
    !details.description ||
    !details.colour ||
    !details.reason
  ) {
    return "All group request fields are required.";
  }

  if (
    !Number.isInteger(details.minimumAge) ||
    details.minimumAge < 0 ||
    details.minimumAge > 120
  ) {
    return "Minimum age must be a whole number between 0 and 120.";
  }

  if (!/^#[0-9A-F]{6}$/.test(details.colour)) {
    return "Choose a valid group colour.";
  }

  return null;
}

function getRequestDecisionDetails(body = {}) {
  return {
    deciderId: ensureText(body.deciderId),
    decision: ensureText(body.decision).toLowerCase(),
    rejectionReason: ensureText(body.rejectionReason),
  };
}

function getMembershipRequestDetails(body = {}) {
  return {
    requesterId: ensureText(body.requesterId),
    reason: ensureText(body.reason),
  };
}

function getGroupMembershipStatus(data, group, user) {
  if (user.systemRole === "superAdmin") {
    return "readOnly";
  }

  const isGroupBanned = data.groupBans.some((ban) => {
    return ban.groupId === group.id && ban.bannedUserId === user.id;
  });

  if (isGroupBanned) {
    return "banned";
  }

  if (group.memberIds.includes(user.id)) {
    return "member";
  }

  const hasPendingRequest = data.requests.some((request) => {
    return (
      request.type === "membership" &&
      request.groupId === group.id &&
      request.requesterId === user.id &&
      request.status === "pending"
    );
  });

  if (hasPendingRequest) {
    return "pending";
  }

  if (user.age < group.minimumAge) {
    return "underAge";
  }

  return "available";
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

  app.get("/api/groups", (req, res) => {
    const data = loadData();
    const userId = ensureText(req.query.userId);
    const user = data.users.find((item) => item.id === userId);

    if (!user) {
      return res.status(404).json({
        valid: false,
        message: "Current user was not found.",
      });
    }

    // Membership state is derived from current data rather than stored twice.
    const groups = data.groups.map((group) => {
      return {
        id: group.id,
        title: group.title,
        description: group.description,
        minimumAge: group.minimumAge,
        colour: group.colour,
        status: getGroupMembershipStatus(data, group, user),
        isAdmin: group.adminIds.includes(user.id),
      };
    });

    return res.status(200).json({
      valid: true,
      groups,
    });
  });

  app.post("/api/group-requests", (req, res) => {
    const data = loadData();
    const details = getGroupRequestDetails(req.body);
    const validationError = validateGroupRequest(details);

    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const requester = data.users.find(
      (user) => user.id === details.requesterId,
    );

    if (!requester) {
      return res.status(404).json({
        valid: false,
        message: "Requesting user was not found.",
      });
    }

    if (requester.systemRole !== "user") {
      return res.status(403).json({
        valid: false,
        message: "Super Admin cannot request a new group.",
      });
    }

    const request = {
      id: `request-${randomUUID()}`,
      type: "groupCreation",
      requesterId: requester.id,
      proposedGroup: {
        title: details.title,
        description: details.description,
        minimumAge: details.minimumAge,
        colour: details.colour,
      },
      reason: details.reason,
      status: "pending",
      rejectionReason: null,
      decidedBy: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };

    data.requests.push(request);
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: "Group request submitted for approval.",
      request,
    });
  });

  app.get("/api/admin/requests", (req, res) => {
    const data = loadData();
    const userId = ensureText(req.query.userId);
    const user = data.users.find((item) => item.id === userId);

    if (!user || user.systemRole !== "superAdmin") {
      return res.status(403).json({
        valid: false,
        message: "Only the Super Admin can view system requests.",
      });
    }

    const requests = data.requests
      .filter((request) => {
        return request.type === "groupCreation" && request.status === "pending";
      })
      .sort((first, second) => {
        return new Date(second.createdAt) - new Date(first.createdAt);
      })
      .map((request) => {
        const requester = data.users.find(
          (item) => item.id === request.requesterId,
        );

        // The inbox needs a display name, not the requester's private account details.
        return {
          ...request,
          requesterName:
            requester ?
              `${requester.firstName} ${requester.lastName}`
            : "Deleted user",
        };
      });

    return res.status(200).json({
      valid: true,
      requests,
    });
  });

  app.get("/api/groups/:id/requests", (req, res) => {
    const data = loadData();
    const userId = ensureText(req.query.userId);
    const group = data.groups.find((item) => item.id === req.params.id);

    if (!group) {
      return res.status(404).json({
        valid: false,
        message: "Group was not found.",
      });
    }

    const user = data.users.find((item) => item.id === userId);

    if (!user || !group.adminIds.includes(user.id)) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can view this group's requests.",
      });
    }

    const requests = data.requests
      .filter((request) => {
        return (
          request.type === "membership" &&
          request.groupId === group.id &&
          request.status === "pending"
        );
      })
      .sort((first, second) => {
        return new Date(second.createdAt) - new Date(first.createdAt);
      })
      .map((request) => {
        const requester = data.users.find(
          (item) => item.id === request.requesterId,
        );

        return {
          ...request,
          requesterName:
            requester ?
              `${requester.firstName} ${requester.lastName}`
            : "Deleted user",
          requesterAge: requester ? requester.age : null,
        };
      });

    return res.status(200).json({
      valid: true,
      group: {
        id: group.id,
        title: group.title,
      },
      requests,
    });
  });

  app.post("/api/groups/:id/join-requests", (req, res) => {
    const details = getMembershipRequestDetails(req.body);

    if (!details.requesterId || !details.reason) {
      return res.status(400).json({
        valid: false,
        message: "A requesting user and reason are required.",
      });
    }

    const data = loadData();
    const group = data.groups.find((item) => item.id === req.params.id);

    if (!group) {
      return res.status(404).json({
        valid: false,
        message: "Group was not found.",
      });
    }

    const requester = data.users.find((user) => user.id === details.requesterId);

    if (!requester) {
      return res.status(404).json({
        valid: false,
        message: "Requesting user was not found.",
      });
    }

    if (requester.systemRole !== "user") {
      return res.status(403).json({
        valid: false,
        message: "Super Admin cannot join groups.",
      });
    }

    if (requester.age < group.minimumAge) {
      return res.status(403).json({
        valid: false,
        message: "You do not meet this group's minimum age.",
      });
    }

    if (group.memberIds.includes(requester.id)) {
      return res.status(409).json({
        valid: false,
        message: "You are already a member of this group.",
      });
    }

    const isGroupBanned = data.groupBans.some((ban) => {
      return ban.groupId === group.id && ban.bannedUserId === requester.id;
    });

    if (isGroupBanned) {
      return res.status(403).json({
        valid: false,
        message: "You are permanently banned from this group.",
      });
    }

    const existingRequest = data.requests.some((request) => {
      return (
        request.type === "membership" &&
        request.groupId === group.id &&
        request.requesterId === requester.id &&
        request.status === "pending"
      );
    });

    if (existingRequest) {
      return res.status(409).json({
        valid: false,
        message: "You already have a pending membership request for this group.",
      });
    }

    const request = {
      id: `request-${randomUUID()}`,
      type: "membership",
      requesterId: requester.id,
      groupId: group.id,
      reason: details.reason,
      status: "pending",
      rejectionReason: null,
      decidedBy: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };

    data.requests.push(request);
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: `Membership request submitted to ${group.title}.`,
      request,
    });
  });

  app.put("/api/requests/:id/decision", (req, res) => {
    const details = getRequestDecisionDetails(req.body);

    if (
      !details.deciderId ||
      !["approved", "rejected"].includes(details.decision)
    ) {
      return res.status(400).json({
        valid: false,
        message: "A decision-maker and valid decision are required.",
      });
    }

    if (details.decision === "rejected" && !details.rejectionReason) {
      return res.status(400).json({
        valid: false,
        message: "A reason is required when rejecting a request.",
      });
    }

    const data = loadData();
    const request = data.requests.find((item) => item.id === req.params.id);

    if (!request) {
      return res.status(404).json({
        valid: false,
        message: "Request was not found.",
      });
    }

    // Other request types will be added as their workflows are implemented.
    if (!["groupCreation", "membership"].includes(request.type)) {
      return res.status(400).json({
        valid: false,
        message: "This request type cannot be decided here yet.",
      });
    }

    if (request.status !== "pending") {
      return res.status(409).json({
        valid: false,
        message: "This request has already been decided.",
      });
    }

    const decider = data.users.find((user) => user.id === details.deciderId);

    if (!decider) {
      return res.status(403).json({
        valid: false,
        message: "The decision-maker is not permitted to decide this request.",
      });
    }

    const requester = data.users.find(
      (user) => user.id === request.requesterId,
    );

    if (!requester || requester.systemRole !== "user") {
      return res.status(409).json({
        valid: false,
        message: "The requesting user is no longer available.",
      });
    }

    let group = null;
    let responseMessage = "";
    const now = new Date().toISOString();

    if (request.type === "groupCreation") {
      if (decider.systemRole !== "superAdmin") {
        return res.status(403).json({
          valid: false,
          message: "Only the Super Admin can decide group requests.",
        });
      }

      if (details.decision === "approved") {
        const titleAlreadyExists = data.groups.some((item) => {
          return (
            item.title.toLowerCase() === request.proposedGroup.title.toLowerCase()
          );
        });

        if (titleAlreadyExists) {
          return res.status(409).json({
            valid: false,
            message: "A group with that title already exists.",
          });
        }

        group = {
          id: `group-${randomUUID()}`,
          title: request.proposedGroup.title,
          description: request.proposedGroup.description,
          minimumAge: request.proposedGroup.minimumAge,
          colour: request.proposedGroup.colour,
          memberIds: [requester.id],
          adminIds: [requester.id],
          roomIds: [],
          createdAt: now,
          updatedAt: now,
        };

        data.groups.push(group);
        request.createdGroupId = group.id;
      }

      responseMessage = `Group request ${details.decision}.`;
    }

    if (request.type === "membership") {
      group = data.groups.find((item) => item.id === request.groupId);

      if (!group) {
        return res.status(409).json({
          valid: false,
          message: "The requested group is no longer available.",
        });
      }

      if (!group.adminIds.includes(decider.id)) {
        return res.status(403).json({
          valid: false,
          message: "Only a Group Admin can decide membership requests.",
        });
      }

      if (details.decision === "approved") {
        if (requester.age < group.minimumAge) {
          return res.status(409).json({
            valid: false,
            message: "The requester no longer meets the group's minimum age.",
          });
        }

        const isGroupBanned = data.groupBans.some((ban) => {
          return ban.groupId === group.id && ban.bannedUserId === requester.id;
        });

        if (isGroupBanned) {
          return res.status(409).json({
            valid: false,
            message: "The requester is permanently banned from this group.",
          });
        }

        if (group.memberIds.includes(requester.id)) {
          return res.status(409).json({
            valid: false,
            message: "The requester is already a member of this group.",
          });
        }

        group.memberIds.push(requester.id);
        group.updatedAt = now;
      }

      responseMessage = `Membership request ${details.decision}.`;
    }

    request.status = details.decision;
    request.rejectionReason =
      details.decision === "rejected" ? details.rejectionReason : null;
    request.decidedBy = decider.id;
    request.decidedAt = now;

    saveData(data);

    return res.status(200).json({
      valid: true,
      message: responseMessage,
      request,
      group,
    });
  });
}

export { routes };
