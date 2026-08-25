import { randomUUID } from "node:crypto";
import { loadData, saveData } from "../data.js";
import {
  ensureText,
  safeGroupUser,
  addAuditLog,
  getGroupSettingsDetails,
  validateGroupSettings,
  getMembershipRequestDetails,
  getAdminChangeDetails,
  getRoomDetails,
  validateRoomDetails,
  getGroupMembershipStatus,
} from "./route-helpers.js";

function groupRoutes(app) {
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

    const groups = data.groups.map((group) => {
      const isAdmin = group.adminIds.includes(user.id);
      let adminSummary = null;

      if (isAdmin) {
        const pendingRequests = data.requests.filter((request) => {
          return request.groupId === group.id && request.status === "pending";
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
        status: getGroupMembershipStatus(data, group, user),
        isAdmin,
        adminSummary,
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

    group.adminIds = group.adminIds.filter(
      (userId) => userId !== targetUser.id,
    );
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
}

export { groupRoutes };
