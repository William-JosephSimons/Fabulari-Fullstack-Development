import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

// Request values pass through this helper before validation or database queries.
function ensureText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Check the date format and the real calendar date because JavaScript adjusts invalid dates.
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  // JavaScript adjusts invalid dates such as 31 February, so compare each part again.
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// Calculate age from birthdate each time so a stored age cannot become stale.
function calculateAge(birthdate) {
  if (!isValidDate(birthdate)) {
    return null;
  }

  const [year, month, day] = birthdate.split("-").map(Number);
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

// Group access checks use the same current-age calculation throughout the server.
function meetsMinimumAge(user, minimumAge) {
  const age = calculateAge(user.birthdate);
  return age !== null && age >= minimumAge;
}

// Copy only the account fields accepted from setup and registration forms.
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

// Check all fields required to create an account.
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

// Copy only the fields a user can change on their own profile.
function getProfileDetails(body = {}) {
  return {
    username: ensureText(body.username),
    firstName: ensureText(body.firstName),
    lastName: ensureText(body.lastName),
    birthdate: ensureText(body.birthdate),
  };
}

// Check the editable profile values before saving them.
function validateProfileDetails(details) {
  if (
    !details.username ||
    !details.firstName ||
    !details.lastName ||
    !details.birthdate
  ) {
    return "All profile fields are required.";
  }

  if (details.username.length < 3 || details.username.length > 30) {
    return "Username must be between 3 and 30 characters.";
  }

  const age = calculateAge(details.birthdate);
  if (age === null || age < 1 || age > 120) {
    return "Enter a valid birthdate for an age between 1 and 120.";
  }

  return null;
}

// Reject a username or email that is already used or permanently banned.
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

// Build the stored account and hash its password before a route inserts it.
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

// Remove database-only and password fields before returning an account.
function safeUser(user) {
  // Password hashes are never sent over the network
  const userSafe = { ...user };
  delete userSafe.passwordHash;
  delete userSafe._id;
  return userSafe;
}

// Return only the account details needed for group administration.
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

// Build audit records in one consistent format.
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

// Request-detail helpers prevent route handlers from saving unrelated body fields.
function getGroupRequestDetails(body = {}) {
  return {
    title: ensureText(body.title),
    description: ensureText(body.description),
    minimumAge: Number(body.minimumAge),
    colour: ensureText(body.colour).toUpperCase(),
    reason: ensureText(body.reason),
  };
}

// Check all fields stored in a proposed group request.
function validateGroupRequest(details) {
  if (
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

// Copy the group fields an existing Group Admin can edit.
function getGroupSettingsDetails(body = {}) {
  return {
    title: ensureText(body.title),
    description: ensureText(body.description),
    minimumAge: Number(body.minimumAge),
    colour: ensureText(body.colour).toUpperCase(),
  };
}

// Check direct group-setting changes before saving them.
function validateGroupSettings(details) {
  if (
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

// Copy the decision and optional rejection reason from a request body.
function getRequestDecisionDetails(body = {}) {
  return {
    decision: ensureText(body.decision).toLowerCase(),
    rejectionReason: ensureText(body.rejectionReason),
  };
}

// Copy the reason supplied with a membership request.
function getMembershipRequestDetails(body = {}) {
  return {
    reason: ensureText(body.reason),
  };
}

// Copy the member ID used for promotion.
function getAdminChangeDetails(body = {}) {
  return {
    targetUserId: ensureText(body.targetUserId),
  };
}

// Copy the editable name and description of a room.
function getRoomDetails(body = {}) {
  return {
    name: ensureText(body.name),
    description: ensureText(body.description),
  };
}

// Require both fields used by direct room maintenance.
function validateRoomDetails(details) {
  if (!details.name || !details.description) {
    return "A room name and description are required.";
  }

  return null;
}

// Copy the room details and reason stored in a member proposal.
function getRoomProposalDetails(body = {}) {
  return {
    name: ensureText(body.name),
    description: ensureText(body.description),
    reason: ensureText(body.reason),
  };
}

// Check all fields required for a room proposal.
function validateRoomProposal(details) {
  if (
    !details.name ||
    !details.description ||
    !details.reason
  ) {
    return "A member, room name, description and reason are required.";
  }

  return null;
}

// Copy the target and reason used in a group-ban report.
function getGroupBanReportDetails(body = {}) {
  return {
    targetUserId: ensureText(body.targetUserId),
    reason: ensureText(body.reason),
  };
}

// Copy the reason supplied with a group-deletion request.
function getGroupDeletionRequestDetails(body = {}) {
  return {
    reason: ensureText(body.reason),
  };
}

// Copy the target and reason used in a system hard-ban request.
function getSystemBanRequestDetails(body = {}) {
  return {
    targetUserId: ensureText(body.targetUserId),
    reason: ensureText(body.reason),
  };
}

// Describe the action available to one user when Angular displays the group list.
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
  isValidDate,
  calculateAge,
  meetsMinimumAge,
  getUserDetails,
  validateUserDetails,
  getProfileDetails,
  validateProfileDetails,
  findAccountConflict,
  createUser,
  safeUser,
  safeGroupUser,
  createAuditLog,
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
