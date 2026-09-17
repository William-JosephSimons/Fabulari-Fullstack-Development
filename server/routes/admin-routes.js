import { requireSuperAdmin } from "../authentication.js";
import { getDatabase } from "../database.js";
import { calculateAge, ensureText, isValidDate } from "./route-helpers.js";

function getListOptions(query = {}) {
  const search = ensureText(query.search);
  const usesPaging = query.skip !== undefined || query.limit !== undefined;
  const skip = Number(ensureText(query.skip) || 0);
  const limit = Number(ensureText(query.limit) || 10);

  if (search.length > 100) {
    return { error: "Search text cannot be longer than 100 characters." };
  }

  if (
    usesPaging &&
    (!Number.isInteger(skip) ||
      skip < 0 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50)
  ) {
    return {
      error: "Paging must use a skip of zero or more and a limit from 1 to 50.",
    };
  }

  return { search, usesPaging, skip, limit };
}

function getSearchPattern(search) {
  // convert search into case insensitive mongoDB regex
  // Prepend backslash to special characters to make the search behave as ordinary text.
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { $regex: escapedSearch, $options: "i" };
}

function adminRoutes(app) {
  app.get("/api/admin/dashboard", async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) {
      return;
    }

    const database = getDatabase();
    const pendingRequests = await database
      .collection("requests")
      .find({
        type: { $in: ["groupCreation", "groupDeletion", "systemBan"] },
        status: "pending",
      })
      .toArray();
    const userCount = await database.collection("users").countDocuments();
    const groupCount = await database.collection("groups").countDocuments();
    const systemBanCount = await database
      .collection("systemBans")
      .countDocuments();

    return res.status(200).json({
      valid: true,
      summary: {
        userCount,
        groupCount,
        pendingRequestCount: pendingRequests.length,
        systemBanCount,
        groupCreationRequestCount: pendingRequests.filter((request) => {
          return request.type === "groupCreation";
        }).length,
        groupDeletionRequestCount: pendingRequests.filter((request) => {
          return request.type === "groupDeletion";
        }).length,
        systemBanRequestCount: pendingRequests.filter((request) => {
          return request.type === "systemBan";
        }).length,
      },
    });
  });

  app.get("/api/admin/requests", async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) {
      return;
    }

    const database = getDatabase();
    const pendingRequests = await database
      .collection("requests")
      .find(
        {
          type: { $in: ["groupCreation", "groupDeletion", "systemBan"] },
          status: "pending",
        },
        { projection: { _id: 0 } },
      )
      .sort({ createdAt: -1 })
      .toArray();
    const users = await database.collection("users").find({}).toArray();
    const groups = await database.collection("groups").find({}).toArray();

    const requests = pendingRequests.map((request) => {
      const requester = users.find((item) => item.id === request.requesterId);
      const group = groups.find((item) => item.id === request.groupId);
      const targetUser = users.find((item) => item.id === request.targetUserId);

      // The inbox only receives the safe names needed to identify each request.
      return {
        ...request,
        requesterName:
          requester ?
            `${requester.firstName} ${requester.lastName}`
          : "Deleted user",
        groupName: group ? group.title : null,
        targetName:
          targetUser ? `${targetUser.firstName} ${targetUser.lastName}`
          : request.targetUserId ? "Deleted user"
          : null,
        targetUsername: targetUser ? targetUser.username : null,
      };
    });

    return res.status(200).json({
      valid: true,
      requests,
    });
  });

  app.get("/api/admin/users", async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) {
      return;
    }

    const options = getListOptions(req.query);

    if (options.error) {
      return res.status(400).json({ valid: false, message: options.error });
    }

    const userFilter = {};

    if (options.search) {
      const searchPattern = getSearchPattern(options.search);
      userFilter.$or = [
        { username: searchPattern },
        { email: searchPattern },
        { firstName: searchPattern },
        { lastName: searchPattern },
      ];
    }

    const database = getDatabase();
    let userCursor = database
      .collection("users")
      .find(userFilter)
      .sort({ username: 1 });

    if (options.usesPaging) {
      userCursor = userCursor.skip(options.skip).limit(options.limit);
    }

    const storedUsers = await userCursor.toArray();
    const total = await database.collection("users").countDocuments(userFilter);
    const users = storedUsers.map((item) => {
      return {
        id: item.id,
        username: item.username,
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        age: calculateAge(item.birthdate),
        avatarUrl: item.avatarUrl,
        systemRole: item.systemRole,
      };
    });

    return res.status(200).json({
      valid: true,
      users,
      total,
      hasMore: options.usesPaging && options.skip + users.length < total,
    });
  });

  app.get("/api/admin/system-bans", async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) {
      return;
    }

    const options = getListOptions(req.query);

    if (options.error) {
      return res.status(400).json({ valid: false, message: options.error });
    }

    const banFilter = {};

    if (options.search) {
      const searchPattern = getSearchPattern(options.search);
      banFilter.$or = [
        { normalizedEmail: searchPattern },
        { reason: searchPattern },
      ];
    }

    const database = getDatabase();
    let banCursor = database
      .collection("systemBans")
      .find(banFilter, { projection: { _id: 0 } })
      .sort({ bannedAt: -1 });

    if (options.usesPaging) {
      banCursor = banCursor.skip(options.skip).limit(options.limit);
    }

    const systemBans = await banCursor.toArray();
    const total = await database
      .collection("systemBans")
      .countDocuments(banFilter);

    return res.status(200).json({
      valid: true,
      systemBans,
      total,
      hasMore: options.usesPaging && options.skip + systemBans.length < total,
    });
  });

  app.get("/api/audit-logs", async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) {
      return;
    }

    const actionType = ensureText(req.query.actionType);
    const startDate = ensureText(req.query.startDate);
    const endDate = ensureText(req.query.endDate);
    const options = getListOptions(req.query);

    if (options.error) {
      return res.status(400).json({ valid: false, message: options.error });
    }

    if (
      (startDate && !isValidDate(startDate)) ||
      (endDate && !isValidDate(endDate))
    ) {
      return res.status(400).json({
        valid: false,
        message: "Audit dates must be valid dates using the YYYY-MM-DD format.",
      });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        valid: false,
        message: "The start date cannot be after the end date.",
      });
    }

    const auditFilter = {};

    if (actionType && actionType !== "all") {
      auditFilter.actionType = actionType;
    }

    if (startDate || endDate) {
      auditFilter.createdAt = {};

      // ISO timestamps compared as text because they use the same format.
      if (startDate) {
        auditFilter.createdAt.$gte = `${startDate}T00:00:00.000Z`;
      }

      if (endDate) {
        auditFilter.createdAt.$lte = `${endDate}T23:59:59.999Z`;
      }
    }

    if (options.search) {
      auditFilter.summary = getSearchPattern(options.search);
    }

    const database = getDatabase();
    let auditCursor = database
      .collection("auditLogs")
      .find(auditFilter, { projection: { _id: 0 } })
      .sort({ createdAt: -1 });

    if (options.usesPaging) {
      auditCursor = auditCursor.skip(options.skip).limit(options.limit);
    }

    const storedLogs = await auditCursor.toArray();
    const total = await database
      .collection("auditLogs")
      .countDocuments(auditFilter);
    const actorIds = [...new Set(storedLogs.map((log) => log.actorId))];
    const groupIds = [
      ...new Set(storedLogs.map((log) => log.groupId).filter(Boolean)),
    ];
    const users = await database
      .collection("users")
      .find({ id: { $in: actorIds } })
      .toArray();
    const groups = await database
      .collection("groups")
      .find({ id: { $in: groupIds } })
      .toArray();
    const allAuditLogs = await database
      .collection("auditLogs")
      .find({}, { projection: { _id: 0, actionType: 1 } })
      .toArray();

    const auditLogs = storedLogs.map((log) => {
      const actor = users.find((item) => item.id === log.actorId);
      const group = groups.find((item) => item.id === log.groupId);
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
      ...new Set(allAuditLogs.map((log) => log.actionType)),
    ].sort();

    return res.status(200).json({
      valid: true,
      auditLogs,
      actionTypes,
      total,
      hasMore: options.usesPaging && options.skip + auditLogs.length < total,
    });
  });
}

export { adminRoutes };
