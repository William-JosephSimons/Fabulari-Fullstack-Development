import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

function ensureText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function calculateAge(birthdate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    return null;
  }

  const [year, month, day] = birthdate.split("-").map(Number);
  const birthDate = new Date(year, month - 1, day);

  // JavaScript adjusts invalid dates such as 31 February, so compare each part again.
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayHasPassed =
    today.getMonth() > month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() >= day);

  if (!birthdayHasPassed) {
    age--;
  }

  return age;
}

function meetsMinimumAge(user, minimumAge) {
  const age = calculateAge(user.birthdate);
  return age !== null && age >= minimumAge;
}

function getUserDetails(body = {}) {
  return {
    username: ensureText(body.username),
    email: ensureText(body.email).toLowerCase(),
    firstName: ensureText(body.firstName),
    lastName: ensureText(body.lastName),
    birthdate: ensureText(body.birthdate),
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
    !details.birthdate ||
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

  const age = calculateAge(details.birthdate);
  if (age === null || age < 1 || age > 120) {
    return "Enter a valid birthdate for an age between 1 and 120.";
  }

  if (details.password.length < 8) {
    return "Password must contain at least 8 characters.";
  }

  return null;
}

async function findAccountConflict(database, details) {
  const users = database.collection("users");
  // Usernames are unique even when the letter case is different.
  const usernameTaken = await users.findOne(
    { username: details.username },
    { collation: { locale: "en", strength: 2 } },
  );

  if (usernameTaken) {
    return "That username is already in use.";
  }

  const emailTaken = await users.findOne({ email: details.email });
  if (emailTaken) {
    return "That email is already registered.";
  }

  const emailBanned = await database
    .collection("systemBans")
    .findOne({ normalizedEmail: details.email });

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
    birthdate: details.birthdate,
    passwordHash: await bcrypt.hash(details.password, 10),
    avatarUrl: null,
    systemRole,
    createdAt: now,
    updatedAt: now,
  };
}

function safeUser(user) {
  // Password hashes are never sent over the network
  const userSafe = { ...user };
  delete userSafe.passwordHash;
  delete userSafe._id;
  return userSafe;
}

function safeGroupUser(user, isAdmin = false) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    age: calculateAge(user.birthdate),
    avatarUrl: user.avatarUrl,
    isAdmin,
  };
}

function createAuditLog(details) {
  return {
    id: `audit-${randomUUID()}`,
    actorId: details.actorId,
    actionType: details.actionType,
    entityType: details.entityType,
    entityId: details.entityId,
    groupId: details.groupId || null,
    summary: details.summary,
    createdAt: details.createdAt || new Date().toISOString(),
  };
}

function addAuditLog(data, details) {
  data.auditLogs.push(createAuditLog(details));
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

  if (!meetsMinimumAge(user, group.minimumAge)) {
    return "underAge";
  }

  return "available";
}

export {
  ensureText,
  calculateAge,
  meetsMinimumAge,
  getUserDetails,
  validateUserDetails,
  findAccountConflict,
  createUser,
  safeUser,
  safeGroupUser,
  createAuditLog,
  addAuditLog,
  getGroupRequestDetails,
  validateGroupRequest,
  getGroupSettingsDetails,
  validateGroupSettings,
  getRequestDecisionDetails,
  getMembershipRequestDetails,
  getAdminChangeDetails,
  getRoomDetails,
  validateRoomDetails,
  getRoomProposalDetails,
  validateRoomProposal,
  getGroupBanReportDetails,
  getGroupDeletionRequestDetails,
  getSystemBanRequestDetails,
  getGroupMembershipStatus,
};
