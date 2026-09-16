import { randomUUID } from "node:crypto";
import { requireLogin } from "../authentication.js";
import { getDatabase } from "../database.js";
import { removeChatImage } from "../upload.js";
import {
  ensureText,
  calculateAge,
  meetsMinimumAge,
  safeGroupUser,
  createAuditLog,
  getGroupSettingsDetails,
  validateGroupSettings,
  getMembershipRequestDetails,
  getAdminChangeDetails,
  getRoomDetails,
  validateRoomDetails,
  getGroupMembershipStatus,
} from "./route-helpers.js";

function groupRoutes(app, io) {
  app.get("/api/groups", async (req, res) => {
    const user = await requireLogin(req, res);

    if (!user) {
      return;
    }

    const database = getDatabase();
    const storedGroups = await database
      .collection("groups")
      .find({}, { projection: { _id: 0 } })
      .toArray();
    const requests = await database
      .collection("requests")
      .find({ status: "pending" }, { projection: { _id: 0 } })
      .toArray();
    const groupBans = await database
      .collection("groupBans")
      .find({}, { projection: { _id: 0 } })
      .toArray();
    const membershipData = { requests, groupBans };

    const groups = storedGroups.map((group) => {
      const isAdmin = group.adminIds.includes(user.id);
      let adminSummary = null;

      if (isAdmin) {
        const pendingRequests = requests.filter((request) => {
          return request.groupId === group.id;
        });

        // Workload details are only returned for groups this user administers.
        adminSummary = {
          memberCount: group.memberIds.length,
          roomCount: group.roomIds.length,
          firstRoomId: group.roomIds[0] || null,
          membershipRequestCount: pendingRequests.filter((request) => {
            return request.type === "membership";
          }).length,
          roomProposalCount: pendingRequests.filter((request) => {
            return request.type === "roomProposal";
          }).length,
          groupBanReportCount: pendingRequests.filter((request) => {
            return request.type === "groupBanReport";
          }).length,
        };
      }

      return {
        id: group.id,
        title: group.title,
        description: group.description,
        minimumAge: group.minimumAge,
        colour: group.colour,
        status: getGroupMembershipStatus(membershipData, group, user),
        isAdmin,
        adminSummary,
      };
    });

    return res.status(200).json({
      valid: true,
      groups,
    });
  });

  app.patch("/api/groups/:id", async (req, res) => {
    const actingUser = await requireLogin(req, res);

    if (!actingUser) {
      return;
    }

    const details = getGroupSettingsDetails(req.body);
    const validationError = validateGroupSettings(details);

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

    if (
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can change this group's settings.",
      });
    }

    const titleAlreadyExists = await database.collection("groups").findOne(
      {
        id: { $ne: group.id },
        title: details.title,
      },
      { collation: { locale: "en", strength: 2 } },
    );

    if (titleAlreadyExists) {
      return res.status(409).json({
        valid: false,
        message: "A group with that title already exists.",
      });
    }

    const members = await database
      .collection("users")
      .find({ id: { $in: group.memberIds } })
      .toArray();
    const underAgeMemberIds = members
      .filter((member) => !meetsMinimumAge(member, details.minimumAge))
      .map((member) => member.id);
    const remainingAdminIds = group.adminIds.filter((adminId) => {
      return !underAgeMemberIds.includes(adminId);
    });

    if (remainingAdminIds.length === 0) {
      return res.status(409).json({
        valid: false,
        message: "The minimum age cannot remove every Group Admin.",
      });
    }

    const now = new Date().toISOString();
    group.title = details.title;
    group.description = details.description;
    group.minimumAge = details.minimumAge;
    group.colour = details.colour;
    // Room access is derived from group membership, so no room records need changing.
    group.memberIds = group.memberIds.filter((memberId) => {
      return !underAgeMemberIds.includes(memberId);
    });
    group.adminIds = remainingAdminIds;
    group.updatedAt = now;

    await database.collection("groups").updateOne(
      { id: group.id },
      {
        $set: {
          title: group.title,
          description: group.description,
          minimumAge: group.minimumAge,
          colour: group.colour,
          memberIds: group.memberIds,
          adminIds: group.adminIds,
          updatedAt: group.updatedAt,
        },
      },
    );
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: actingUser.id,
        actionType: "groupUpdated",
        entityType: "group",
        entityId: group.id,
        groupId: group.id,
        summary: `Updated ${group.title}.`,
        createdAt: now,
      }),
    );

    // Removed members must stop receiving live messages from this group.
    for (const socket of io.sockets.sockets.values()) {
      if (
        underAgeMemberIds.includes(socket.data.userId) &&
        group.roomIds.includes(socket.data.roomId)
      ) {
        socket.disconnect(true);
      }
    }

    return res.status(200).json({
      valid: true,
      message: "Group settings updated.",
      group,
      removedMemberCount: underAgeMemberIds.length,
    });
  });

  app.get("/api/groups/:id/users", async (req, res) => {
    const user = await requireLogin(req, res);

    if (!user) {
      return;
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

    if (
      user.systemRole !== "user" ||
      !group.adminIds.includes(user.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can view this group's users.",
      });
    }

    const storedMembers = await database
      .collection("users")
      .find({ id: { $in: group.memberIds } })
      .toArray();
    const members = storedMembers
      .map((member) => {
        return safeGroupUser(member, group.adminIds.includes(member.id));
      })
      .sort((first, second) => {
        return first.firstName.localeCompare(second.firstName);
      });

    const bans = await database
      .collection("groupBans")
      .find({ groupId: group.id }, { projection: { _id: 0 } })
      .sort({ bannedAt: -1 })
      .toArray();
    const bannedAccounts = await database
      .collection("users")
      .find({ id: { $in: bans.map((ban) => ban.bannedUserId) } })
      .toArray();
    const bannedUsers = bans.map((ban) => {
      const bannedUser = bannedAccounts.find(
        (item) => item.id === ban.bannedUserId,
      );

      return {
        id: ban.bannedUserId,
        username: bannedUser ? bannedUser.username : "Deleted user",
        firstName: bannedUser ? bannedUser.firstName : "Deleted",
        lastName: bannedUser ? bannedUser.lastName : "user",
        age: bannedUser ? calculateAge(bannedUser.birthdate) : null,
        avatarUrl: bannedUser ? bannedUser.avatarUrl : null,
        reason: ban.reason,
        bannedAt: ban.bannedAt,
      };
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

  app.get("/api/groups/:id/rooms", async (req, res) => {
    const user = await requireLogin(req, res);

    if (!user) {
      return;
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

    if (
      user.systemRole !== "user" ||
      !group.memberIds.includes(user.id) ||
      !meetsMinimumAge(user, group.minimumAge)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only eligible group members can view these rooms.",
      });
    }

    const storedRooms = await database
      .collection("rooms")
      .find({ id: { $in: group.roomIds } }, { projection: { _id: 0 } })
      .toArray();
    // roomIds keeps the rooms in the order saved by the group.
    const rooms = group.roomIds
      .map((roomId) => storedRooms.find((room) => room.id === roomId))
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

  app.post("/api/groups/:id/rooms", async (req, res) => {
    const actingUser = await requireLogin(req, res);

    if (!actingUser) {
      return;
    }

    const details = getRoomDetails(req.body);
    const validationError = validateRoomDetails(details);

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

    if (
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can create rooms in this group.",
      });
    }

    const nameAlreadyExists = await database.collection("rooms").findOne(
      {
        groupId: group.id,
        name: details.name,
      },
      { collation: { locale: "en", strength: 2 } },
    );

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
    await database.collection("rooms").insertOne({ ...room });
    group.roomIds.push(room.id);
    await database.collection("groups").updateOne(
      { id: group.id },
      {
        $set: {
          roomIds: group.roomIds,
          updatedAt: now,
        },
      },
    );
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: actingUser.id,
        actionType: "roomCreated",
        entityType: "room",
        entityId: room.id,
        groupId: group.id,
        summary: `Created ${room.name} in ${group.title}.`,
        createdAt: now,
      }),
    );

    return res.status(201).json({
      valid: true,
      message: "Room created.",
      room,
    });
  });

  app.patch("/api/rooms/:id", async (req, res) => {
    const actingUser = await requireLogin(req, res);

    if (!actingUser) {
      return;
    }

    const details = getRoomDetails(req.body);
    const validationError = validateRoomDetails(details);

    if (validationError) {
      return res.status(400).json({ valid: false, message: validationError });
    }

    const database = getDatabase();
    const room = await database
      .collection("rooms")
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!room) {
      return res.status(404).json({
        valid: false,
        message: "Room was not found.",
      });
    }

    const group = await database
      .collection("groups")
      .findOne({ id: room.groupId }, { projection: { _id: 0 } });

    if (
      !group ||
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can edit this room.",
      });
    }

    const nameAlreadyExists = await database.collection("rooms").findOne(
      {
        id: { $ne: room.id },
        groupId: group.id,
        name: details.name,
      },
      { collation: { locale: "en", strength: 2 } },
    );

    if (nameAlreadyExists) {
      return res.status(409).json({
        valid: false,
        message: "A room with that name already exists in this group.",
      });
    }

    const now = new Date().toISOString();
    room.name = details.name;
    room.description = details.description;
    room.updatedAt = now;

    await database.collection("rooms").updateOne(
      { id: room.id },
      {
        $set: {
          name: room.name,
          description: room.description,
          updatedAt: now,
        },
      },
    );
    await database
      .collection("groups")
      .updateOne({ id: group.id }, { $set: { updatedAt: now } });
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: actingUser.id,
        actionType: "roomUpdated",
        entityType: "room",
        entityId: room.id,
        groupId: group.id,
        summary: `Updated ${room.name} in ${group.title}.`,
        createdAt: now,
      }),
    );

    return res.status(200).json({
      valid: true,
      message: "Room updated.",
      room,
    });
  });

  app.delete("/api/rooms/:id", async (req, res) => {
    const actingUser = await requireLogin(req, res);

    if (!actingUser) {
      return;
    }

    const database = getDatabase();
    const room = await database
      .collection("rooms")
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!room) {
      return res.status(404).json({
        valid: false,
        message: "Room was not found.",
      });
    }

    const group = await database
      .collection("groups")
      .findOne({ id: room.groupId }, { projection: { _id: 0 } });

    if (
      !group ||
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can delete this room.",
      });
    }

    const now = new Date().toISOString();
    const roomMessages = await database
      .collection("messages")
      .find({ roomId: room.id })
      .toArray();

    // Delete the room, its messages and the matching reference held by its group.
    await database.collection("rooms").deleteOne({ id: room.id });
    await database.collection("messages").deleteMany({ roomId: room.id });
    group.roomIds = group.roomIds.filter((roomId) => roomId !== room.id);
    await database.collection("groups").updateOne(
      { id: group.id },
      {
        $set: {
          roomIds: group.roomIds,
          updatedAt: now,
        },
      },
    );
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: actingUser.id,
        actionType: "roomDeleted",
        entityType: "room",
        entityId: room.id,
        groupId: group.id,
        summary: `Deleted ${room.name} from ${group.title}.`,
        createdAt: now,
      }),
    );

    for (const message of roomMessages) {
      if (message.type === "image") {
        removeChatImage(message.imageUrl);
      }
    }

    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.roomId === room.id) {
        socket.disconnect(true);
      }
    }

    return res.status(200).json({
      valid: true,
      message: "Room deleted.",
      roomId: room.id,
    });
  });

  app.post("/api/groups/:id/join-requests", async (req, res) => {
    const requester = await requireLogin(req, res);

    if (!requester) {
      return;
    }

    const details = getMembershipRequestDetails(req.body);

    if (!details.reason) {
      return res.status(400).json({
        valid: false,
        message: "A membership reason is required.",
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

    if (requester.systemRole !== "user") {
      return res.status(403).json({
        valid: false,
        message: "Super Admin cannot join groups.",
      });
    }

    if (!meetsMinimumAge(requester, group.minimumAge)) {
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

    const isGroupBanned = await database.collection("groupBans").findOne({
      groupId: group.id,
      bannedUserId: requester.id,
    });

    if (isGroupBanned) {
      return res.status(403).json({
        valid: false,
        message: "You are permanently banned from this group.",
      });
    }

    const existingRequest = await database.collection("requests").findOne({
      type: "membership",
      groupId: group.id,
      requesterId: requester.id,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(409).json({
        valid: false,
        message:
          "You already have a pending membership request for this group.",
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

    await database.collection("requests").insertOne({ ...request });
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: requester.id,
        actionType: "membershipRequested",
        entityType: "request",
        entityId: request.id,
        groupId: group.id,
        summary: `Requested membership of ${group.title}.`,
        createdAt: request.createdAt,
      }),
    );

    return res.status(201).json({
      valid: true,
      message: `Membership request submitted to ${group.title}.`,
      request,
    });
  });

  app.post("/api/groups/:id/admins", async (req, res) => {
    const actingUser = await requireLogin(req, res);

    if (!actingUser) {
      return;
    }

    const details = getAdminChangeDetails(req.body);

    if (!details.targetUserId) {
      return res.status(400).json({
        valid: false,
        message: "A target user is required.",
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

    if (
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can promote group members.",
      });
    }

    const targetUser = await database
      .collection("users")
      .findOne({ id: details.targetUserId });

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

    const now = new Date().toISOString();
    group.adminIds.push(targetUser.id);
    await database.collection("groups").updateOne(
      { id: group.id },
      {
        $set: {
          adminIds: group.adminIds,
          updatedAt: now,
        },
      },
    );
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: actingUser.id,
        actionType: "groupAdminPromoted",
        entityType: "user",
        entityId: targetUser.id,
        groupId: group.id,
        summary: `Promoted ${targetUser.username} in ${group.title}.`,
        createdAt: now,
      }),
    );

    return res.status(200).json({
      valid: true,
      message: `${targetUser.firstName} is now a Group Admin.`,
      groupId: group.id,
      adminIds: group.adminIds,
    });
  });

  app.delete("/api/groups/:id/admins/:userId", async (req, res) => {
    const actingUser = await requireLogin(req, res);

    if (!actingUser) {
      return;
    }

    const targetUserId = ensureText(req.params.userId);

    if (!targetUserId) {
      return res.status(400).json({
        valid: false,
        message: "A target user is required.",
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

    if (
      actingUser.systemRole !== "user" ||
      !group.adminIds.includes(actingUser.id)
    ) {
      return res.status(403).json({
        valid: false,
        message: "Only a Group Admin can demote another Group Admin.",
      });
    }

    const targetUser = await database
      .collection("users")
      .findOne({ id: targetUserId });

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

    const now = new Date().toISOString();
    group.adminIds = group.adminIds.filter(
      (userId) => userId !== targetUser.id,
    );
    await database.collection("groups").updateOne(
      { id: group.id },
      {
        $set: {
          adminIds: group.adminIds,
          updatedAt: now,
        },
      },
    );
    await database.collection("auditLogs").insertOne(
      createAuditLog({
        actorId: actingUser.id,
        actionType: "groupAdminDemoted",
        entityType: "user",
        entityId: targetUser.id,
        groupId: group.id,
        summary: `Demoted ${targetUser.username} in ${group.title}.`,
        createdAt: now,
      }),
    );

    return res.status(200).json({
      valid: true,
      message: `${targetUser.firstName} is no longer a Group Admin.`,
      groupId: group.id,
      adminIds: group.adminIds,
    });
  });
}

export { groupRoutes };
