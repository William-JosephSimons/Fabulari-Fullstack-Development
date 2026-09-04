import { loadData } from "../data.js";
import { calculateAge, ensureText } from "./route-helpers.js";

function adminRoutes(app) {
  app.get("/api/admin/dashboard", (req, res) => {
    const data = loadData();
    const userId = ensureText(req.query.userId);
    const user = data.users.find((item) => item.id === userId);

    if (!user || user.systemRole !== "superAdmin") {
      return res.status(403).json({
        valid: false,
        message: "Only the Super Admin can view the system dashboard.",
      });
    }

    // These are the three request types decided by the Super Admin.
    const pendingRequests = data.requests.filter((request) => {
      return (
        ["groupCreation", "groupDeletion", "systemBan"].includes(
          request.type,
        ) && request.status === "pending"
      );
    });

    return res.status(200).json({
      valid: true,
      summary: {
        userCount: data.users.length,
        groupCount: data.groups.length,
        pendingRequestCount: pendingRequests.length,
        systemBanCount: data.systemBans.length,
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
}

export { adminRoutes };
