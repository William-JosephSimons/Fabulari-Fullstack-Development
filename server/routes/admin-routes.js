import { getDatabase } from "../database.js";
import { loadData } from "../data.js";
import { calculateAge, ensureText } from "./route-helpers.js";

function adminRoutes(app) {
  app.get("/api/admin/dashboard", async (req, res) => {
    const database = getDatabase();
    const userId = ensureText(req.query.userId);
    const user = await database.collection("users").findOne({ id: userId });

    if (!user || user.systemRole !== "superAdmin") {
      return res.status(403).json({
        valid: false,
        message: "Only the Super Admin can view the system dashboard.",
      });
    }

    // Requests remain in JSON until their read and decision routes move together.
    const pendingRequests = loadData().requests.filter((request) => {
      return (
        ["groupCreation", "groupDeletion", "systemBan"].includes(
          request.type,
        ) && request.status === "pending"
      );
    });
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
    const database = getDatabase();
    const userId = ensureText(req.query.userId);
    const user = await database.collection("users").findOne({ id: userId });

    if (!user || user.systemRole !== "superAdmin") {
      return res.status(403).json({
        valid: false,
        message: "Only the Super Admin can view the system user list.",
      });
    }

    const storedUsers = await database.collection("users").find({}).toArray();
    const users = storedUsers
      .map((item) => {
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
      })
      .sort((first, second) => {
        return first.username.localeCompare(second.username);
      });

    return res.status(200).json({
      valid: true,
      users,
    });
  });

  app.get("/api/admin/system-bans", async (req, res) => {
    const database = getDatabase();
    const userId = ensureText(req.query.userId);
    const user = await database.collection("users").findOne({ id: userId });

    if (!user || user.systemRole !== "superAdmin") {
      return res.status(403).json({
        valid: false,
        message: "Only the Super Admin can view permanent system bans.",
      });
    }

    const systemBans = await database
      .collection("systemBans")
      .find({}, { projection: { _id: 0 } })
      .sort({ bannedAt: -1 })
      .toArray();

    return res.status(200).json({
      valid: true,
      systemBans,
    });
  });

  app.get("/api/audit-logs", async (req, res) => {
    const database = getDatabase();
    const userId = ensureText(req.query.userId);
    const actionType = ensureText(req.query.actionType);
    const startDate = ensureText(req.query.startDate);
    const endDate = ensureText(req.query.endDate);
    const user = await database.collection("users").findOne({ id: userId });

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

    const storedLogs = await database
      .collection("auditLogs")
      .find(auditFilter, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    const users = await database.collection("users").find({}).toArray();
    const groups = await database.collection("groups").find({}).toArray();
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
    });
  });
}

export { adminRoutes };
