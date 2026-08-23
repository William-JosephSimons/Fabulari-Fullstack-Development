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

function safeGroupUser(user, isAdmin = false) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    age: user.age,
    avatarUrl: user.avatarUrl,
    isAdmin,
  };
}

function addAuditLog(data, details) {
  data.auditLogs.push({
    id: `audit-${randomUUID()}`,
    actorId: details.actorId,
    actionType: details.actionType,
    entityType: details.entityType,
    entityId: details.entityId,
    groupId: details.groupId || null,
    summary: details.summary,
    createdAt: details.createdAt || new Date().toISOString(),
  });
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

function getGroupSettingsDetails(body = {}) {
  return {
    actingUserId: ensureText(body.actingUserId),
    title: ensureText(body.title),
    description: ensureText(body.description),
    minimumAge: Number(body.minimumAge),
    colour: ensureText(body.colour).toUpperCase(),
  };
}

function validateGroupSettings(details) {
  if (
    !details.actingUserId ||
    !details.title ||
    !details.description ||
    !details.colour
  ) {
    return "All group settings are required.";
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

function getAdminChangeDetails(body = {}) {
  return {
    actingUserId: ensureText(body.actingUserId),
    targetUserId: ensureText(body.targetUserId),
  };
}

function getRoomDetails(body = {}) {
  return {
    actingUserId: ensureText(body.actingUserId),
    name: ensureText(body.name),
    description: ensureText(body.description),
  };
}

function validateRoomDetails(details) {
  if (!details.actingUserId || !details.name || !details.description) {
    return "A Group Admin, room name and description are required.";
  }

  return null;
}

function getRoomProposalDetails(body = {}) {
  return {
    requesterId: ensureText(body.requesterId),
    name: ensureText(body.name),
    description: ensureText(body.description),
    reason: ensureText(body.reason),
  };
}

function validateRoomProposal(details) {
  if (
    !details.requesterId ||
    !details.name ||
    !details.description ||
    !details.reason
  ) {
    return "A member, room name, description and reason are required.";
  }

  return null;
}

function getGroupBanReportDetails(body = {}) {
  return {
    requesterId: ensureText(body.requesterId),
    targetUserId: ensureText(body.targetUserId),
    reason: ensureText(body.reason),
  };
}

function getGroupDeletionRequestDetails(body = {}) {
  return {
    requesterId: ensureText(body.requesterId),
    reason: ensureText(body.reason),
  };
}

function getSystemBanRequestDetails(body = {}) {
  return {
    requesterId: ensureText(body.requesterId),
    targetUserId: ensureText(body.targetUserId),
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

  app.patch("/api/groups/:id", (req, res) => {
    const details = getGroupSettingsDetails(req.body);
    const validationError = validateGroupSettings(details);

    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const data = loadData();
    const group = data.groups.find((item) => item.id === req.params.id);

    if (!group) {
      return res.status(404).json({
        valid: false,
        message: "Group was not found.",
      });
    }

    const actingUser = data.users.find((user) => {
      return user.id === details.actingUserId;
    });

    if (
      !actingUser ||
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can change this group's settings.",
      });
    }

    const titleAlreadyExists = data.groups.some((item) => {
      return (
        item.id !== group.id &&
        item.title.toLowerCase() === details.title.toLowerCase()
      );
    });

    if (titleAlreadyExists) {
      return res.status(409).json({
        valid: false,
        message: "A group with that title already exists.",
      });
    }

    const underAgeMemberIds = group.memberIds.filter((memberId) => {
      const member = data.users.find((user) => user.id === memberId);
      return member && member.age < details.minimumAge;
    });

    const remainingAdminIds = group.adminIds.filter((adminId) => {
      return !underAgeMemberIds.includes(adminId);
    });

    if (remainingAdminIds.length === 0) {
      return res.status(409).json({
        valid: false,
        message: "The minimum age cannot remove every Group Admin.",
      });
    }

    group.title = details.title;
    group.description = details.description;
    group.minimumAge = details.minimumAge;
    group.colour = details.colour;
    // Room access is derived from group membership, so no room records need changing.
    group.memberIds = group.memberIds.filter((memberId) => {
      return !underAgeMemberIds.includes(memberId);
    });
    group.adminIds = remainingAdminIds;
    group.updatedAt = new Date().toISOString();
    addAuditLog(data, {
      actorId: actingUser.id,
      actionType: "groupUpdated",
      entityType: "group",
      entityId: group.id,
      groupId: group.id,
      summary: `Updated ${group.title}.`,
      createdAt: group.updatedAt,
    });
    saveData(data);

    return res.status(200).json({
      valid: true,
      message: "Group settings updated.",
      group,
      removedMemberCount: underAgeMemberIds.length,
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
    addAuditLog(data, {
      actorId: requester.id,
      actionType: "groupCreationRequested",
      entityType: "request",
      entityId: request.id,
      summary: `Requested a new group named ${request.proposedGroup.title}.`,
      createdAt: request.createdAt,
    });
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: "Group request submitted for approval.",
      request,
    });
  });

  app.get("/api/requests/mine", (req, res) => {
    const data = loadData();
    const userId = ensureText(req.query.userId);
    const user = data.users.find((item) => item.id === userId);

    if (!user) {
      return res.status(404).json({
        valid: false,
        message: "Current user was not found.",
      });
    }

    const requests = data.requests
      .filter((request) => {
        // The assignment requires users to see pending and rejected requests.
        return (
          request.requesterId === user.id &&
          ["pending", "rejected"].includes(request.status)
        );
      })
      .sort((first, second) => {
        return new Date(second.createdAt) - new Date(first.createdAt);
      })
      .map((request) => {
        const group = data.groups.find((item) => item.id === request.groupId);
        const targetUser = data.users.find(
          (item) => item.id === request.targetUserId,
        );
        let groupName = request.proposedGroup?.title || null;

        if (group) {
          groupName = group.title;
        } else if (request.groupId) {
          groupName = "Deleted group";
        }

        return {
          ...request,
          groupName,
          targetName:
            targetUser ?
              `${targetUser.firstName} ${targetUser.lastName}`
            : request.targetUserId ?
              "Deleted user"
            : null,
        };
      });

    return res.status(200).json({
      valid: true,
      requests,
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
        return (
          ["groupCreation", "groupDeletion", "systemBan"].includes(
            request.type,
          ) && request.status === "pending"
        );
      })
      .sort((first, second) => {
        return new Date(second.createdAt) - new Date(first.createdAt);
      })
      .map((request) => {
        const requester = data.users.find(
          (item) => item.id === request.requesterId,
        );
        const group = data.groups.find((item) => item.id === request.groupId);
        const targetUser = data.users.find(
          (item) => item.id === request.targetUserId,
        );

        // The inbox only receives the safe names needed to identify each request.
        return {
          ...request,
          requesterName:
            requester ?
              `${requester.firstName} ${requester.lastName}`
            : "Deleted user",
          groupName: group ? group.title : null,
          targetName:
            targetUser ?
              `${targetUser.firstName} ${targetUser.lastName}`
            : request.targetUserId ?
              "Deleted user"
            : null,
          targetUsername: targetUser ? targetUser.username : null,
        };
      });

    return res.status(200).json({
      valid: true,
      requests,
    });
  });

  app.get("/api/admin/users", (req, res) => {
    const data = loadData();
    const userId = ensureText(req.query.userId);
    const user = data.users.find((item) => item.id === userId);

    if (!user || user.systemRole !== "superAdmin") {
      return res.status(403).json({
        valid: false,
        message: "Only the Super Admin can view the system user list.",
      });
    }

    const users = data.users
      .map((item) => {
        return {
          id: item.id,
          username: item.username,
          email: item.email,
          firstName: item.firstName,
          lastName: item.lastName,
          age: item.age,
          avatarUrl: item.avatarUrl,
          systemRole: item.systemRole,
        };
      })
      .sort((first, second) => {
        return first.username.localeCompare(second.username);
      });

    return res.status(200).json({
      valid: true,
      users,
    });
  });

  app.get("/api/admin/system-bans", (req, res) => {
    const data = loadData();
    const userId = ensureText(req.query.userId);
    const user = data.users.find((item) => item.id === userId);

    if (!user || user.systemRole !== "superAdmin") {
      return res.status(403).json({
        valid: false,
        message: "Only the Super Admin can view permanent system bans.",
      });
    }

    const systemBans = [...data.systemBans].sort((first, second) => {
      return new Date(second.bannedAt) - new Date(first.bannedAt);
    });

    return res.status(200).json({
      valid: true,
      systemBans,
    });
  });

  app.get("/api/audit-logs", (req, res) => {
    const data = loadData();
    const userId = ensureText(req.query.userId);
    const actionType = ensureText(req.query.actionType);
    const startDate = ensureText(req.query.startDate);
    const endDate = ensureText(req.query.endDate);
    const user = data.users.find((item) => item.id === userId);

    if (!user || user.systemRole !== "superAdmin") {
      return res.status(403).json({
        valid: false,
        message: "Only the Super Admin can view audit logs.",
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (
      (startDate && !datePattern.test(startDate)) ||
      (endDate && !datePattern.test(endDate))
    ) {
      return res.status(400).json({
        valid: false,
        message: "Audit dates must use the YYYY-MM-DD format.",
      });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        valid: false,
        message: "The start date cannot be after the end date.",
      });
    }

    const auditLogs = data.auditLogs
      .filter((log) => {
        const logDate = log.createdAt.slice(0, 10);
        const matchesType =
          !actionType || actionType === "all" || log.actionType === actionType;
        const afterStart = !startDate || logDate >= startDate;
        const beforeEnd = !endDate || logDate <= endDate;

        return matchesType && afterStart && beforeEnd;
      })
      .sort((first, second) => {
        return new Date(second.createdAt) - new Date(first.createdAt);
      })
      .map((log) => {
        const actor = data.users.find((item) => item.id === log.actorId);
        const group = data.groups.find((item) => item.id === log.groupId);
        let groupName = null;

        if (group) {
          groupName = group.title;
        } else if (log.groupId) {
          groupName = "Deleted group";
        }

        return {
          ...log,
          actorUsername: actor ? actor.username : "Deleted user",
          groupName,
        };
      });

    const actionTypes = [
      ...new Set(data.auditLogs.map((log) => log.actionType)),
    ].sort();

    return res.status(200).json({
      valid: true,
      auditLogs,
      actionTypes,
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
          ["membership", "roomProposal", "groupBanReport"].includes(
            request.type,
          ) &&
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
        const targetUser = data.users.find(
          (item) => item.id === request.targetUserId,
        );

        return {
          ...request,
          requesterName:
            requester ?
              `${requester.firstName} ${requester.lastName}`
            : "Deleted user",
          requesterAge: requester ? requester.age : null,
          targetName:
            targetUser ?
              `${targetUser.firstName} ${targetUser.lastName}`
            : request.targetUserId ?
              "Deleted user"
            : null,
          targetAge: targetUser ? targetUser.age : null,
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

  app.get("/api/groups/:id/users", (req, res) => {
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

    if (
      !user ||
      user.systemRole !== "user" ||
      !group.adminIds.includes(user.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can view this group's users.",
      });
    }

    const members = group.memberIds
      .map((memberId) => data.users.find((item) => item.id === memberId))
      .filter((member) => member)
      .map((member) => {
        return safeGroupUser(member, group.adminIds.includes(member.id));
      })
      .sort((first, second) => {
        return first.firstName.localeCompare(second.firstName);
      });

    const bannedUsers = data.groupBans
      .filter((ban) => ban.groupId === group.id)
      .map((ban) => {
        const bannedUser = data.users.find(
          (item) => item.id === ban.bannedUserId,
        );

        return {
          id: ban.bannedUserId,
          username: bannedUser ? bannedUser.username : "Deleted user",
          firstName: bannedUser ? bannedUser.firstName : "Deleted",
          lastName: bannedUser ? bannedUser.lastName : "user",
          age: bannedUser ? bannedUser.age : null,
          avatarUrl: bannedUser ? bannedUser.avatarUrl : null,
          reason: ban.reason,
          bannedAt: ban.bannedAt,
        };
      })
      .sort((first, second) => {
        return new Date(second.bannedAt) - new Date(first.bannedAt);
      });

    return res.status(200).json({
      valid: true,
      group: {
        id: group.id,
        title: group.title,
        description: group.description,
        minimumAge: group.minimumAge,
        colour: group.colour,
      },
      members,
      bannedUsers,
    });
  });

  app.get("/api/groups/:id/rooms", (req, res) => {
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

    if (
      !user ||
      user.systemRole !== "user" ||
      !group.memberIds.includes(user.id) ||
      user.age < group.minimumAge
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only eligible group members can view these rooms.",
      });
    }

    // roomIds keeps the rooms in the order saved by the group.
    const rooms = group.roomIds
      .map((roomId) => data.rooms.find((room) => room.id === roomId))
      .filter((room) => room);

    return res.status(200).json({
      valid: true,
      group: {
        id: group.id,
        title: group.title,
        minimumAge: group.minimumAge,
        colour: group.colour,
        isAdmin: group.adminIds.includes(user.id),
      },
      rooms,
    });
  });

  app.post("/api/groups/:id/rooms", (req, res) => {
    const details = getRoomDetails(req.body);
    const validationError = validateRoomDetails(details);

    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const data = loadData();
    const group = data.groups.find((item) => item.id === req.params.id);

    if (!group) {
      return res.status(404).json({
        valid: false,
        message: "Group was not found.",
      });
    }

    const actingUser = data.users.find((user) => {
      return user.id === details.actingUserId;
    });

    if (
      !actingUser ||
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can create rooms in this group.",
      });
    }

    const nameAlreadyExists = data.rooms.some((room) => {
      return (
        room.groupId === group.id &&
        room.name.toLowerCase() === details.name.toLowerCase()
      );
    });

    if (nameAlreadyExists) {
      return res.status(409).json({
        valid: false,
        message: "A room with that name already exists in this group.",
      });
    }

    const now = new Date().toISOString();
    const room = {
      id: `room-${randomUUID()}`,
      groupId: group.id,
      name: details.name,
      description: details.description,
      createdBy: actingUser.id,
      createdAt: now,
      updatedAt: now,
    };

    // Rooms inherit the group's age and colour, so those values are not copied here.
    data.rooms.push(room);
    group.roomIds.push(room.id);
    group.updatedAt = now;
    addAuditLog(data, {
      actorId: actingUser.id,
      actionType: "roomCreated",
      entityType: "room",
      entityId: room.id,
      groupId: group.id,
      summary: `Created ${room.name} in ${group.title}.`,
      createdAt: now,
    });
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: "Room created.",
      room,
    });
  });

  app.patch("/api/rooms/:id", (req, res) => {
    const details = getRoomDetails(req.body);
    const validationError = validateRoomDetails(details);

    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const data = loadData();
    const room = data.rooms.find((item) => item.id === req.params.id);

    if (!room) {
      return res.status(404).json({
        valid: false,
        message: "Room was not found.",
      });
    }

    const group = data.groups.find((item) => item.id === room.groupId);
    const actingUser = data.users.find((user) => {
      return user.id === details.actingUserId;
    });

    if (
      !group ||
      !actingUser ||
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can edit this room.",
      });
    }

    const nameAlreadyExists = data.rooms.some((item) => {
      return (
        item.id !== room.id &&
        item.groupId === group.id &&
        item.name.toLowerCase() === details.name.toLowerCase()
      );
    });

    if (nameAlreadyExists) {
      return res.status(409).json({
        valid: false,
        message: "A room with that name already exists in this group.",
      });
    }

    room.name = details.name;
    room.description = details.description;
    room.updatedAt = new Date().toISOString();
    group.updatedAt = room.updatedAt;
    addAuditLog(data, {
      actorId: actingUser.id,
      actionType: "roomUpdated",
      entityType: "room",
      entityId: room.id,
      groupId: group.id,
      summary: `Updated ${room.name} in ${group.title}.`,
      createdAt: room.updatedAt,
    });
    saveData(data);

    return res.status(200).json({
      valid: true,
      message: "Room updated.",
      room,
    });
  });

  app.delete("/api/rooms/:id", (req, res) => {
    const actingUserId = ensureText(req.query.actingUserId);

    if (!actingUserId) {
      return res.status(400).json({
        valid: false,
        message: "An acting Group Admin is required.",
      });
    }

    const data = loadData();
    const room = data.rooms.find((item) => item.id === req.params.id);

    if (!room) {
      return res.status(404).json({
        valid: false,
        message: "Room was not found.",
      });
    }

    const group = data.groups.find((item) => item.id === room.groupId);
    const actingUser = data.users.find((user) => user.id === actingUserId);

    if (
      !group ||
      !actingUser ||
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can delete this room.",
      });
    }

    // Delete the room record and the matching reference held by its group.
    data.rooms = data.rooms.filter((item) => item.id !== room.id);
    group.roomIds = group.roomIds.filter((roomId) => roomId !== room.id);
    group.updatedAt = new Date().toISOString();
    addAuditLog(data, {
      actorId: actingUser.id,
      actionType: "roomDeleted",
      entityType: "room",
      entityId: room.id,
      groupId: group.id,
      summary: `Deleted ${room.name} from ${group.title}.`,
      createdAt: group.updatedAt,
    });
    saveData(data);

    return res.status(200).json({
      valid: true,
      message: "Room deleted.",
      roomId: room.id,
    });
  });

  app.post("/api/groups/:id/room-requests", (req, res) => {
    const details = getRoomProposalDetails(req.body);
    const validationError = validateRoomProposal(details);

    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const data = loadData();
    const group = data.groups.find((item) => item.id === req.params.id);

    if (!group) {
      return res.status(404).json({
        valid: false,
        message: "Group was not found.",
      });
    }

    const requester = data.users.find((user) => {
      return user.id === details.requesterId;
    });

    if (
      !requester ||
      requester.systemRole !== "user" ||
      !group.memberIds.includes(requester.id) ||
      requester.age < group.minimumAge
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only eligible group members can propose a room.",
      });
    }

    const roomAlreadyExists = data.rooms.some((room) => {
      return (
        room.groupId === group.id &&
        room.name.toLowerCase() === details.name.toLowerCase()
      );
    });

    if (roomAlreadyExists) {
      return res.status(409).json({
        valid: false,
        message: "A room with that name already exists in this group.",
      });
    }

    const matchingProposal = data.requests.some((request) => {
      return (
        request.type === "roomProposal" &&
        request.groupId === group.id &&
        request.status === "pending" &&
        request.proposedRoom.name.toLowerCase() === details.name.toLowerCase()
      );
    });

    if (matchingProposal) {
      return res.status(409).json({
        valid: false,
        message: "That room has already been proposed for this group.",
      });
    }

    const request = {
      id: `request-${randomUUID()}`,
      type: "roomProposal",
      requesterId: requester.id,
      groupId: group.id,
      proposedRoom: {
        name: details.name,
        description: details.description,
      },
      reason: details.reason,
      status: "pending",
      rejectionReason: null,
      decidedBy: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };

    data.requests.push(request);
    addAuditLog(data, {
      actorId: requester.id,
      actionType: "roomProposalSubmitted",
      entityType: "request",
      entityId: request.id,
      groupId: group.id,
      summary: `Proposed ${request.proposedRoom.name} for ${group.title}.`,
      createdAt: request.createdAt,
    });
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: "Room proposal submitted.",
      request,
    });
  });

  app.post("/api/groups/:id/ban-reports", (req, res) => {
    const details = getGroupBanReportDetails(req.body);

    if (!details.requesterId || !details.targetUserId || !details.reason) {
      return res.status(400).json({
        valid: false,
        message: "A Group Admin, target member and report reason are required.",
      });
    }

    if (details.requesterId === details.targetUserId) {
      return res.status(400).json({
        valid: false,
        message: "A Group Admin cannot report themselves.",
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

    const requester = data.users.find((user) => {
      return user.id === details.requesterId;
    });

    if (
      !requester ||
      requester.systemRole !== "user" ||
      !group.adminIds.includes(requester.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can submit a group-ban report.",
      });
    }

    const targetUser = data.users.find((user) => {
      return user.id === details.targetUserId;
    });

    if (!targetUser || !group.memberIds.includes(targetUser.id)) {
      return res.status(409).json({
        valid: false,
        message: "Only a current group member can be reported.",
      });
    }

    const alreadyBanned = data.groupBans.some((ban) => {
      return ban.groupId === group.id && ban.bannedUserId === targetUser.id;
    });

    if (alreadyBanned) {
      return res.status(409).json({
        valid: false,
        message: "That account is already banned from this group.",
      });
    }

    const reportAlreadyPending = data.requests.some((request) => {
      return (
        request.type === "groupBanReport" &&
        request.groupId === group.id &&
        request.targetUserId === targetUser.id &&
        request.status === "pending"
      );
    });

    if (reportAlreadyPending) {
      return res.status(409).json({
        valid: false,
        message: "A group-ban report for that member is already pending.",
      });
    }

    const request = {
      id: `request-${randomUUID()}`,
      type: "groupBanReport",
      requesterId: requester.id,
      groupId: group.id,
      targetUserId: targetUser.id,
      reason: details.reason,
      status: "pending",
      rejectionReason: null,
      decidedBy: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };

    data.requests.push(request);
    addAuditLog(data, {
      actorId: requester.id,
      actionType: "groupBanReported",
      entityType: "request",
      entityId: request.id,
      groupId: group.id,
      summary: `Reported ${targetUser.username} for a group ban in ${group.title}.`,
      createdAt: request.createdAt,
    });
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: "Group-ban report submitted.",
      request,
    });
  });

  app.post("/api/groups/:id/delete-request", (req, res) => {
    const details = getGroupDeletionRequestDetails(req.body);

    if (!details.requesterId || !details.reason) {
      return res.status(400).json({
        valid: false,
        message: "A Group Admin and deletion reason are required.",
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

    const requester = data.users.find((user) => {
      return user.id === details.requesterId;
    });

    if (
      !requester ||
      requester.systemRole !== "user" ||
      !group.adminIds.includes(requester.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can request group deletion.",
      });
    }

    const deletionAlreadyPending = data.requests.some((request) => {
      return (
        request.type === "groupDeletion" &&
        request.groupId === group.id &&
        request.status === "pending"
      );
    });

    if (deletionAlreadyPending) {
      return res.status(409).json({
        valid: false,
        message: "A deletion request for this group is already pending.",
      });
    }

    const request = {
      id: `request-${randomUUID()}`,
      type: "groupDeletion",
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
    addAuditLog(data, {
      actorId: requester.id,
      actionType: "groupDeletionRequested",
      entityType: "request",
      entityId: request.id,
      groupId: group.id,
      summary: `Requested deletion of ${group.title}.`,
      createdAt: request.createdAt,
    });
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: "Group deletion request submitted.",
      request,
    });
  });

  app.post("/api/groups/:id/system-ban-requests", (req, res) => {
    const details = getSystemBanRequestDetails(req.body);

    if (!details.requesterId || !details.targetUserId || !details.reason) {
      return res.status(400).json({
        valid: false,
        message: "A Group Admin, target user and reason are required.",
      });
    }

    if (details.requesterId === details.targetUserId) {
      return res.status(400).json({
        valid: false,
        message: "A Group Admin cannot request deletion of their own account.",
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

    const requester = data.users.find((user) => {
      return user.id === details.requesterId;
    });

    if (
      !requester ||
      requester.systemRole !== "user" ||
      !group.adminIds.includes(requester.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can request a system hard ban.",
      });
    }

    const targetUser = data.users.find((user) => {
      return user.id === details.targetUserId;
    });

    // Group Admins can only report accounts they are responsible for in this group.
    if (
      !targetUser ||
      targetUser.systemRole !== "user" ||
      !group.memberIds.includes(targetUser.id)
    ) {
      return res.status(409).json({
        valid: false,
        message: "Only a current group member can be submitted for a system hard ban.",
      });
    }

    const requestAlreadyPending = data.requests.some((request) => {
      return (
        request.type === "systemBan" &&
        request.targetUserId === targetUser.id &&
        request.status === "pending"
      );
    });

    if (requestAlreadyPending) {
      return res.status(409).json({
        valid: false,
        message: "A system hard-ban request for that user is already pending.",
      });
    }

    const request = {
      id: `request-${randomUUID()}`,
      type: "systemBan",
      requesterId: requester.id,
      groupId: group.id,
      targetUserId: targetUser.id,
      reason: details.reason,
      status: "pending",
      rejectionReason: null,
      decidedBy: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };

    data.requests.push(request);
    addAuditLog(data, {
      actorId: requester.id,
      actionType: "systemBanRequested",
      entityType: "request",
      entityId: request.id,
      groupId: group.id,
      summary: `Requested a system hard ban for ${targetUser.username}.`,
      createdAt: request.createdAt,
    });
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: "System hard-ban request submitted.",
      request,
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
    addAuditLog(data, {
      actorId: requester.id,
      actionType: "membershipRequested",
      entityType: "request",
      entityId: request.id,
      groupId: group.id,
      summary: `Requested membership of ${group.title}.`,
      createdAt: request.createdAt,
    });
    saveData(data);

    return res.status(201).json({
      valid: true,
      message: `Membership request submitted to ${group.title}.`,
      request,
    });
  });

  app.post("/api/groups/:id/admins", (req, res) => {
    const details = getAdminChangeDetails(req.body);

    if (!details.actingUserId || !details.targetUserId) {
      return res.status(400).json({
        valid: false,
        message: "An acting user and target user are required.",
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

    const actingUser = data.users.find(
      (user) => user.id === details.actingUserId,
    );

    if (
      !actingUser ||
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can promote group members.",
      });
    }

    const targetUser = data.users.find(
      (user) => user.id === details.targetUserId,
    );

    if (!targetUser || targetUser.systemRole !== "user") {
      return res.status(404).json({
        valid: false,
        message: "Target user was not found.",
      });
    }

    if (!group.memberIds.includes(targetUser.id)) {
      return res.status(409).json({
        valid: false,
        message: "Only an existing group member can become a Group Admin.",
      });
    }

    if (group.adminIds.includes(targetUser.id)) {
      return res.status(409).json({
        valid: false,
        message: "That user is already a Group Admin.",
      });
    }

    group.adminIds.push(targetUser.id);
    group.updatedAt = new Date().toISOString();
    addAuditLog(data, {
      actorId: actingUser.id,
      actionType: "groupAdminPromoted",
      entityType: "user",
      entityId: targetUser.id,
      groupId: group.id,
      summary: `Promoted ${targetUser.username} in ${group.title}.`,
      createdAt: group.updatedAt,
    });
    saveData(data);

    return res.status(200).json({
      valid: true,
      message: `${targetUser.firstName} is now a Group Admin.`,
      groupId: group.id,
      adminIds: group.adminIds,
    });
  });

  app.delete("/api/groups/:id/admins/:userId", (req, res) => {
    const actingUserId = ensureText(req.query.actingUserId);
    const targetUserId = ensureText(req.params.userId);

    if (!actingUserId || !targetUserId) {
      return res.status(400).json({
        valid: false,
        message: "An acting user and target user are required.",
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

    const actingUser = data.users.find((user) => user.id === actingUserId);

    if (
      !actingUser ||
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can demote another Group Admin.",
      });
    }

    const targetUser = data.users.find((user) => user.id === targetUserId);

    if (!targetUser || !group.adminIds.includes(targetUser.id)) {
      return res.status(409).json({
        valid: false,
        message: "That user is not a Group Admin.",
      });
    }

    if (group.adminIds.length === 1) {
      return res.status(409).json({
        valid: false,
        message: "A group must always have at least one Group Admin.",
      });
    }

    if (actingUser.id === targetUser.id) {
      return res.status(403).json({
        valid: false,
        message: "A Group Admin cannot demote themselves.",
      });
    }

    group.adminIds = group.adminIds.filter((userId) => userId !== targetUser.id);
    group.updatedAt = new Date().toISOString();
    addAuditLog(data, {
      actorId: actingUser.id,
      actionType: "groupAdminDemoted",
      entityType: "user",
      entityId: targetUser.id,
      groupId: group.id,
      summary: `Demoted ${targetUser.username} in ${group.title}.`,
      createdAt: group.updatedAt,
    });
    saveData(data);

    return res.status(200).json({
      valid: true,
      message: `${targetUser.firstName} is no longer a Group Admin.`,
      groupId: group.id,
      adminIds: group.adminIds,
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

    // Reject unknown request types before entering the decision switch.
    if (
      ![
        "groupCreation",
        "membership",
        "roomProposal",
        "groupBanReport",
        "groupDeletion",
        "systemBan",
      ].includes(request.type)
    ) {
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

    switch (request.type) {
      case "groupCreation": {
        if (decider.systemRole !== "superAdmin") {
          return res.status(403).json({
            valid: false,
            message: "Only the Super Admin can decide group requests.",
          });
        }

        if (details.decision === "approved") {
          const titleAlreadyExists = data.groups.some((item) => {
            return (
              item.title.toLowerCase() ===
              request.proposedGroup.title.toLowerCase()
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
        break;
      }

      case "membership": {
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
        break;
      }

      case "roomProposal": {
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
            message: "Only a Group Admin can decide room proposals.",
          });
        }

        if (details.decision === "approved") {
          if (
            !group.memberIds.includes(requester.id) ||
            requester.age < group.minimumAge
          ) {
            return res.status(409).json({
              valid: false,
              message: "The requester is no longer an eligible group member.",
            });
          }

          const nameAlreadyExists = data.rooms.some((room) => {
            return (
              room.groupId === group.id &&
              room.name.toLowerCase() === request.proposedRoom.name.toLowerCase()
            );
          });

          if (nameAlreadyExists) {
            return res.status(409).json({
              valid: false,
              message: "A room with that name already exists in this group.",
            });
          }

          const room = {
            id: `room-${randomUUID()}`,
            groupId: group.id,
            name: request.proposedRoom.name,
            description: request.proposedRoom.description,
            createdBy: requester.id,
            approvedBy: decider.id,
            requestId: request.id,
            createdAt: now,
            updatedAt: now,
          };

          data.rooms.push(room);
          group.roomIds.push(room.id);
          group.updatedAt = now;
          request.createdRoomId = room.id;
        }

        responseMessage = `Room proposal ${details.decision}.`;
        break;
      }

      case "groupBanReport": {
        group = data.groups.find((item) => item.id === request.groupId);

        if (!group) {
          return res.status(409).json({
            valid: false,
            message: "The reported group is no longer available.",
          });
        }

        if (!group.adminIds.includes(decider.id)) {
          return res.status(403).json({
            valid: false,
            message: "Only a Group Admin can decide group-ban reports.",
          });
        }

        if (
          details.decision === "approved" &&
          decider.id === request.requesterId
        ) {
          return res.status(403).json({
            valid: false,
            message: "The report submitter cannot approve their own report.",
          });
        }

        if (details.decision === "approved") {
          const targetUser = data.users.find((user) => {
            return user.id === request.targetUserId;
          });

          if (!targetUser || !group.memberIds.includes(targetUser.id)) {
            return res.status(409).json({
              valid: false,
              message: "The reported user is no longer a group member.",
            });
          }

          const alreadyBanned = data.groupBans.some((ban) => {
            return (
              ban.groupId === group.id && ban.bannedUserId === targetUser.id
            );
          });

          if (alreadyBanned) {
            return res.status(409).json({
              valid: false,
              message: "That account is already banned from this group.",
            });
          }

          if (
            group.adminIds.includes(targetUser.id) &&
            group.adminIds.length === 1
          ) {
            return res.status(409).json({
              valid: false,
              message: "The final Group Admin cannot be banned.",
            });
          }

          const groupBan = {
            id: `group-ban-${randomUUID()}`,
            groupId: group.id,
            bannedUserId: targetUser.id,
            sourceRequestId: request.id,
            approvedBy: decider.id,
            reason: request.reason,
            bannedAt: now,
          };

          data.groupBans.push(groupBan);
          // Removing group membership also removes access to every room in the group.
          group.memberIds = group.memberIds.filter((userId) => {
            return userId !== targetUser.id;
          });
          group.adminIds = group.adminIds.filter((userId) => {
            return userId !== targetUser.id;
          });
          group.updatedAt = now;
          request.createdGroupBanId = groupBan.id;
        }

        responseMessage = `Group-ban report ${details.decision}.`;
        break;
      }

      case "groupDeletion": {
        if (decider.systemRole !== "superAdmin") {
          return res.status(403).json({
            valid: false,
            message: "Only the Super Admin can decide group deletion requests.",
          });
        }

        group = data.groups.find((item) => item.id === request.groupId);

        if (!group) {
          return res.status(409).json({
            valid: false,
            message: "The requested group is no longer available.",
          });
        }

        if (
          details.decision === "approved" &&
          !group.adminIds.includes(requester.id)
        ) {
          return res.status(409).json({
            valid: false,
            message: "The requester is no longer a Group Admin for this group.",
          });
        }

        if (details.decision === "approved") {
          data.groups = data.groups.filter((item) => item.id !== group.id);
          data.rooms = data.rooms.filter((room) => room.groupId !== group.id);
          data.groupBans = data.groupBans.filter((ban) => {
            return ban.groupId !== group.id;
          });
          // Keep this decision for history, but discard other requests that can no longer be actioned.
          data.requests = data.requests.filter((item) => {
            return (
              item.id === request.id ||
              item.groupId !== group.id ||
              item.status !== "pending"
            );
          });
        }

        responseMessage = `Group deletion request ${details.decision}.`;
        break;
      }

      case "systemBan": {
        if (decider.systemRole !== "superAdmin") {
          return res.status(403).json({
            valid: false,
            message: "Only the Super Admin can decide system hard-ban requests.",
          });
        }

        group = data.groups.find((item) => item.id === request.groupId);

        if (!group) {
          return res.status(409).json({
            valid: false,
            message: "The reporting group is no longer available.",
          });
        }

        if (details.decision === "approved") {
          if (!group.adminIds.includes(requester.id)) {
            return res.status(409).json({
              valid: false,
              message: "The requester is no longer a Group Admin for this group.",
            });
          }

          const targetUser = data.users.find((user) => {
            return user.id === request.targetUserId;
          });

          if (
            !targetUser ||
            targetUser.systemRole !== "user" ||
            !group.memberIds.includes(targetUser.id)
          ) {
            return res.status(409).json({
              valid: false,
              message: "The target is no longer an active member of this group.",
            });
          }

          if (targetUser.id === requester.id) {
            return res.status(409).json({
              valid: false,
              message: "A Group Admin cannot request deletion of their own account.",
            });
          }

          const groupWithoutReplacement = data.groups.find((item) => {
            return (
              item.adminIds.includes(targetUser.id) && item.adminIds.length === 1
            );
          });

          if (groupWithoutReplacement) {
            return res.status(409).json({
              valid: false,
              message: `${targetUser.firstName} is the final Group Admin of ${groupWithoutReplacement.title}.`,
            });
          }

          const alreadySystemBanned = data.systemBans.some((ban) => {
            return ban.normalizedEmail === targetUser.email.toLowerCase();
          });

          if (alreadySystemBanned) {
            return res.status(409).json({
              valid: false,
              message: "That email is already permanently banned.",
            });
          }

          const systemBan = {
            id: `system-ban-${randomUUID()}`,
            normalizedEmail: targetUser.email.toLowerCase(),
            deletedUserId: targetUser.id,
            sourceRequestId: request.id,
            reason: request.reason,
            bannedAt: now,
          };

          data.systemBans.push(systemBan);
          data.users = data.users.filter((user) => user.id !== targetUser.id);

          data.groups.forEach((item) => {
            const wasMember = item.memberIds.includes(targetUser.id);
            const wasAdmin = item.adminIds.includes(targetUser.id);

            if (wasMember || wasAdmin) {
              item.memberIds = item.memberIds.filter((userId) => {
                return userId !== targetUser.id;
              });
              item.adminIds = item.adminIds.filter((userId) => {
                return userId !== targetUser.id;
              });
              item.updatedAt = now;
            }
          });

          // Pending requests from or about the deleted account cannot be completed later.
          data.requests = data.requests.filter((item) => {
            return (
              item.id === request.id ||
              item.status !== "pending" ||
              (item.requesterId !== targetUser.id &&
                item.targetUserId !== targetUser.id)
            );
          });

          request.createdSystemBanId = systemBan.id;
        }

        responseMessage = `System hard-ban request ${details.decision}.`;
        break;
      }
    }

    request.status = details.decision;
    request.rejectionReason =
      details.decision === "rejected" ? details.rejectionReason : null;
    request.decidedBy = decider.id;
    request.decidedAt = now;

    const approvedActionTypes = {
      groupCreation: "groupCreationApproved",
      membership: "membershipApproved",
      roomProposal: "roomProposalApproved",
      groupBanReport: "groupBanApproved",
      groupDeletion: "groupDeletionApproved",
      systemBan: "systemBanApproved",
    };

    let auditEntityType = "request";
    let auditEntityId = request.id;

    if (details.decision === "approved") {
      switch (request.type) {
        case "groupCreation":
          auditEntityType = "group";
          auditEntityId = request.createdGroupId;
          break;
        case "membership":
          auditEntityType = "user";
          auditEntityId = requester.id;
          break;
        case "roomProposal":
          auditEntityType = "room";
          auditEntityId = request.createdRoomId;
          break;
        case "groupBanReport":
          auditEntityType = "groupBan";
          auditEntityId = request.createdGroupBanId;
          break;
        case "groupDeletion":
          auditEntityType = "group";
          auditEntityId = request.groupId;
          break;
        case "systemBan":
          auditEntityType = "systemBan";
          auditEntityId = request.createdSystemBanId;
          break;
      }
    }

    addAuditLog(data, {
      actorId: decider.id,
      actionType:
        details.decision === "approved" ?
          approvedActionTypes[request.type]
        : "requestRejected",
      entityType: auditEntityType,
      entityId: auditEntityId,
      groupId: request.groupId || (group ? group.id : null),
      summary: responseMessage,
      createdAt: now,
    });

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
