import { randomUUID } from "node:crypto";
import { getDatabase } from "../database.js";
import {
  ensureText,
  calculateAge,
  meetsMinimumAge,
  createAuditLog,
  getGroupRequestDetails,
  validateGroupRequest,
  getRequestDecisionDetails,
  getRoomProposalDetails,
  validateRoomProposal,
  getGroupBanReportDetails,
  getGroupDeletionRequestDetails,
  getSystemBanRequestDetails,
} from "./route-helpers.js";

function requestRoutes(app) {
  app.post("/api/group-requests", async (req, res) => {
    const details = getGroupRequestDetails(req.body);
    const validationError = validateGroupRequest(details);

    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const database = getDatabase();
    const requester = await database
      .collection("users")
      .findOne({ id: details.requesterId });

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

    await database.collection("requests").insertOne({ ...request });
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: requester.id,
        actionType: "groupCreationRequested",
        entityType: "request",
        entityId: request.id,
        summary: `Requested a new group named ${request.proposedGroup.title}.`,
        createdAt: request.createdAt,
      }),
    );

    return res.status(201).json({
      valid: true,
      message: "Group request submitted for approval.",
      request,
    });
  });

  app.get("/api/requests/mine", async (req, res) => {
    const database = getDatabase();
    const userId = ensureText(req.query.userId);
    const user = await database.collection("users").findOne({ id: userId });

    if (!user) {
      return res.status(404).json({
        valid: false,
        message: "Current user was not found.",
      });
    }

    // Allow the user to see pending and rejected requests.
    const storedRequests = await database
      .collection("requests")
      .find(
        {
          requesterId: user.id,
          status: { $in: ["pending", "rejected"] },
        },
        { projection: { _id: 0 } },
      )
      .sort({ createdAt: -1 })
      .toArray();
    const groups = await database.collection("groups").find({}).toArray();
    const users = await database.collection("users").find({}).toArray();

    const requests = storedRequests.map((request) => {
      const group = groups.find((item) => item.id === request.groupId);
      const targetUser = users.find((item) => item.id === request.targetUserId);
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
          targetUser ? `${targetUser.firstName} ${targetUser.lastName}`
          : request.targetUserId ? "Deleted user"
          : null,
      };
    });

    return res.status(200).json({
      valid: true,
      requests,
    });
  });

  app.get("/api/groups/:id/requests", async (req, res) => {
    const database = getDatabase();
    const userId = ensureText(req.query.userId);
    const group = await database
      .collection("groups")
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!group) {
      return res.status(404).json({
        valid: false,
        message: "Group was not found.",
      });
    }

    const user = await database.collection("users").findOne({ id: userId });

    if (!user || !group.adminIds.includes(user.id)) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can view this group's requests.",
      });
    }

    const storedRequests = await database
      .collection("requests")
      .find(
        {
          type: { $in: ["membership", "roomProposal", "groupBanReport"] },
          groupId: group.id,
          status: "pending",
        },
        { projection: { _id: 0 } },
      )
      .sort({ createdAt: -1 })
      .toArray();
    const users = await database.collection("users").find({}).toArray();

    const requests = storedRequests.map((request) => {
      const requester = users.find((item) => item.id === request.requesterId);
      const targetUser = users.find((item) => item.id === request.targetUserId);

      return {
        ...request,
        requesterName:
          requester ?
            `${requester.firstName} ${requester.lastName}`
          : "Deleted user",
        requesterAge: requester ? calculateAge(requester.birthdate) : null,
        targetName:
          targetUser ? `${targetUser.firstName} ${targetUser.lastName}`
          : request.targetUserId ? "Deleted user"
          : null,
        targetAge: targetUser ? calculateAge(targetUser.birthdate) : null,
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

  app.post("/api/groups/:id/room-requests", async (req, res) => {
    const details = getRoomProposalDetails(req.body);
    const validationError = validateRoomProposal(details);

    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const database = getDatabase();
    const group = await database
      .collection("groups")
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!group) {
      return res.status(404).json({
        valid: false,
        message: "Group was not found.",
      });
    }

    const requester = await database
      .collection("users")
      .findOne({ id: details.requesterId });

    if (
      !requester ||
      requester.systemRole !== "user" ||
      !group.memberIds.includes(requester.id) ||
      !meetsMinimumAge(requester, group.minimumAge)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only eligible group members can propose a room.",
      });
    }

    const roomAlreadyExists = await database
      .collection("rooms")
      .findOne(
        { groupId: group.id, name: details.name },
        { collation: { locale: "en", strength: 2 } },
      );

    if (roomAlreadyExists) {
      return res.status(409).json({
        valid: false,
        message: "A room with that name already exists in this group.",
      });
    }

    const matchingProposal = await database.collection("requests").findOne(
      {
        type: "roomProposal",
        groupId: group.id,
        status: "pending",
        "proposedRoom.name": details.name,
      },
      { collation: { locale: "en", strength: 2 } },
    );

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

    await database.collection("requests").insertOne({ ...request });
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: requester.id,
        actionType: "roomProposalSubmitted",
        entityType: "request",
        entityId: request.id,
        groupId: group.id,
        summary: `Proposed ${request.proposedRoom.name} for ${group.title}.`,
        createdAt: request.createdAt,
      }),
    );

    return res.status(201).json({
      valid: true,
      message: "Room proposal submitted.",
      request,
    });
  });

  app.post("/api/groups/:id/ban-reports", async (req, res) => {
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

    const database = getDatabase();
    const group = await database
      .collection("groups")
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!group) {
      return res.status(404).json({
        valid: false,
        message: "Group was not found.",
      });
    }

    const requester = await database
      .collection("users")
      .findOne({ id: details.requesterId });

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

    const targetUser = await database
      .collection("users")
      .findOne({ id: details.targetUserId });

    if (!targetUser || !group.memberIds.includes(targetUser.id)) {
      return res.status(409).json({
        valid: false,
        message: "Only a current group member can be reported.",
      });
    }

    const alreadyBanned = await database.collection("groupBans").findOne({
      groupId: group.id,
      bannedUserId: targetUser.id,
    });

    if (alreadyBanned) {
      return res.status(409).json({
        valid: false,
        message: "That account is already banned from this group.",
      });
    }

    const reportAlreadyPending = await database.collection("requests").findOne({
      type: "groupBanReport",
      groupId: group.id,
      targetUserId: targetUser.id,
      status: "pending",
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

    await database.collection("requests").insertOne({ ...request });
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: requester.id,
        actionType: "groupBanReported",
        entityType: "request",
        entityId: request.id,
        groupId: group.id,
        summary: `Reported ${targetUser.username} for a group ban in ${group.title}.`,
        createdAt: request.createdAt,
      }),
    );

    return res.status(201).json({
      valid: true,
      message: "Group-ban report submitted.",
      request,
    });
  });

  app.post("/api/groups/:id/delete-request", async (req, res) => {
    const details = getGroupDeletionRequestDetails(req.body);

    if (!details.requesterId || !details.reason) {
      return res.status(400).json({
        valid: false,
        message: "A Group Admin and deletion reason are required.",
      });
    }

    const database = getDatabase();
    const group = await database
      .collection("groups")
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!group) {
      return res.status(404).json({
        valid: false,
        message: "Group was not found.",
      });
    }

    const requester = await database
      .collection("users")
      .findOne({ id: details.requesterId });

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

    const deletionAlreadyPending = await database
      .collection("requests")
      .findOne({
        type: "groupDeletion",
        groupId: group.id,
        status: "pending",
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

    await database.collection("requests").insertOne({ ...request });
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: requester.id,
        actionType: "groupDeletionRequested",
        entityType: "request",
        entityId: request.id,
        groupId: group.id,
        summary: `Requested deletion of ${group.title}.`,
        createdAt: request.createdAt,
      }),
    );

    return res.status(201).json({
      valid: true,
      message: "Group deletion request submitted.",
      request,
    });
  });

  app.post("/api/groups/:id/system-ban-requests", async (req, res) => {
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

    const database = getDatabase();
    const group = await database
      .collection("groups")
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!group) {
      return res.status(404).json({
        valid: false,
        message: "Group was not found.",
      });
    }

    const requester = await database
      .collection("users")
      .findOne({ id: details.requesterId });

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

    const targetUser = await database
      .collection("users")
      .findOne({ id: details.targetUserId });

    // A Group Admin user can only report accounts from their own group.
    if (
      !targetUser ||
      targetUser.systemRole !== "user" ||
      !group.memberIds.includes(targetUser.id)
    ) {
      return res.status(409).json({
        valid: false,
        message:
          "Only a current group member can be submitted for a system hard ban.",
      });
    }

    const requestAlreadyPending = await database
      .collection("requests")
      .findOne({
        type: "systemBan",
        targetUserId: targetUser.id,
        status: "pending",
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

    await database.collection("requests").insertOne({ ...request });
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: requester.id,
        actionType: "systemBanRequested",
        entityType: "request",
        entityId: request.id,
        groupId: group.id,
        summary: `Requested a system hard ban for ${targetUser.username}.`,
        createdAt: request.createdAt,
      }),
    );

    return res.status(201).json({
      valid: true,
      message: "System hard-ban request submitted.",
      request,
    });
  });

  app.put("/api/requests/:id/decision", async (req, res) => {
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

    const database = getDatabase();
    const request = await database
      .collection("requests")
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

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

    const decider = await database
      .collection("users")
      .findOne({ id: details.deciderId });

    if (!decider) {
      return res.status(403).json({
        valid: false,
        message: "The decision-maker is not permitted to decide this request.",
      });
    }

    const requester = await database
      .collection("users")
      .findOne({ id: request.requesterId });

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
          const titleAlreadyExists = await database
            .collection("groups")
            .findOne(
              { title: request.proposedGroup.title },
              { collation: { locale: "en", strength: 2 } },
            );

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

          await database.collection("groups").insertOne({ ...group });
          request.createdGroupId = group.id;
        }

        responseMessage = `Group request ${details.decision}.`;
        break;
      }

      case "membership": {
        group = await database
          .collection("groups")
          .findOne({ id: request.groupId }, { projection: { _id: 0 } });

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
          if (!meetsMinimumAge(requester, group.minimumAge)) {
            return res.status(409).json({
              valid: false,
              message: "The requester no longer meets the group's minimum age.",
            });
          }

          const isGroupBanned = await database.collection("groupBans").findOne({
            groupId: group.id,
            bannedUserId: requester.id,
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
          await database.collection("groups").updateOne(
            { id: group.id },
            {
              $set: {
                memberIds: group.memberIds,
                updatedAt: now,
              },
            },
          );
        }

        responseMessage = `Membership request ${details.decision}.`;
        break;
      }

      case "roomProposal": {
        group = await database
          .collection("groups")
          .findOne({ id: request.groupId }, { projection: { _id: 0 } });

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
            !meetsMinimumAge(requester, group.minimumAge)
          ) {
            return res.status(409).json({
              valid: false,
              message: "The requester is no longer an eligible group member.",
            });
          }

          const nameAlreadyExists = await database.collection("rooms").findOne(
            {
              groupId: group.id,
              name: request.proposedRoom.name,
            },
            { collation: { locale: "en", strength: 2 } },
          );

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

          await database.collection("rooms").insertOne({ ...room });
          group.roomIds.push(room.id);
          group.updatedAt = now;
          await database.collection("groups").updateOne(
            { id: group.id },
            {
              $set: {
                roomIds: group.roomIds,
                updatedAt: now,
              },
            },
          );
          request.createdRoomId = room.id;
        }

        responseMessage = `Room proposal ${details.decision}.`;
        break;
      }

      case "groupBanReport": {
        group = await database
          .collection("groups")
          .findOne({ id: request.groupId }, { projection: { _id: 0 } });

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
          const targetUser = await database
            .collection("users")
            .findOne({ id: request.targetUserId });

          if (!targetUser || !group.memberIds.includes(targetUser.id)) {
            return res.status(409).json({
              valid: false,
              message: "The reported user is no longer a group member.",
            });
          }

          const alreadyBanned = await database.collection("groupBans").findOne({
            groupId: group.id,
            bannedUserId: targetUser.id,
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

          await database.collection("groupBans").insertOne({ ...groupBan });
          // Removing group membership also removes access to every room in the group.
          group.memberIds = group.memberIds.filter((userId) => {
            return userId !== targetUser.id;
          });
          group.adminIds = group.adminIds.filter((userId) => {
            return userId !== targetUser.id;
          });
          group.updatedAt = now;
          await database.collection("groups").updateOne(
            { id: group.id },
            {
              $set: {
                memberIds: group.memberIds,
                adminIds: group.adminIds,
                updatedAt: now,
              },
            },
          );
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

        group = await database
          .collection("groups")
          .findOne({ id: request.groupId }, { projection: { _id: 0 } });

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
          await database.collection("groups").deleteOne({ id: group.id });
          await database.collection("rooms").deleteMany({ groupId: group.id });
          await database
            .collection("groupBans")
            .deleteMany({ groupId: group.id });
          // Keep this decision for history. Other pending group requests can no
          // longer be actioned after the group is deleted.
          await database.collection("requests").deleteMany({
            id: { $ne: request.id },
            groupId: group.id,
            status: "pending",
          });
        }

        responseMessage = `Group deletion request ${details.decision}.`;
        break;
      }

      case "systemBan": {
        if (decider.systemRole !== "superAdmin") {
          return res.status(403).json({
            valid: false,
            message:
              "Only the Super Admin can decide system hard-ban requests.",
          });
        }

        group = await database
          .collection("groups")
          .findOne({ id: request.groupId }, { projection: { _id: 0 } });

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
              message:
                "The requester is no longer a Group Admin for this group.",
            });
          }

          const targetUser = await database
            .collection("users")
            .findOne({ id: request.targetUserId });

          if (
            !targetUser ||
            targetUser.systemRole !== "user" ||
            !group.memberIds.includes(targetUser.id)
          ) {
            return res.status(409).json({
              valid: false,
              message:
                "The target is no longer an active member of this group.",
            });
          }

          if (targetUser.id === requester.id) {
            return res.status(409).json({
              valid: false,
              message:
                "A Group Admin cannot request deletion of their own account.",
            });
          }

          const administeredGroups = await database
            .collection("groups")
            .find({ adminIds: targetUser.id }, { projection: { _id: 0 } })
            .toArray();
          const groupWithoutReplacement = administeredGroups.find((item) => {
            return item.adminIds.length === 1;
          });

          if (groupWithoutReplacement) {
            return res.status(409).json({
              valid: false,
              message: `${targetUser.firstName} is the final Group Admin of ${groupWithoutReplacement.title}.`,
            });
          }

          const alreadySystemBanned = await database
            .collection("systemBans")
            .findOne({ normalizedEmail: targetUser.email.toLowerCase() });

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

          await database.collection("systemBans").insertOne({ ...systemBan });
          await database.collection("users").deleteOne({ id: targetUser.id });

          const affectedGroups = await database
            .collection("groups")
            .find(
              {
                $or: [
                  { memberIds: targetUser.id },
                  { adminIds: targetUser.id },
                ],
              },
              { projection: { _id: 0 } },
            )
            .toArray();

          for (const item of affectedGroups) {
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

              await database.collection("groups").updateOne(
                { id: item.id },
                {
                  $set: {
                    memberIds: item.memberIds,
                    adminIds: item.adminIds,
                    updatedAt: now,
                  },
                },
              );

              if (item.id === group.id) {
                group = item;
              }
            }
          }

          // Pending requests from or about the deleted account cannot be completed later.
          await database.collection("requests").deleteMany({
            id: { $ne: request.id },
            status: "pending",
            $or: [
              { requesterId: targetUser.id },
              { targetUserId: targetUser.id },
            ],
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

    // The switch may add the ID of a group, room or ban created by approval.
    await database
      .collection("requests")
      .updateOne({ id: request.id }, { $set: request });
    await database.collection("auditLogs").insertOne(
      createAuditLog({
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
      }),
    );

    return res.status(200).json({
      valid: true,
      message: responseMessage,
      request,
      group,
    });
  });
}

export { requestRoutes };
