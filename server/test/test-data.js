import { getDatabase } from "../database.js";

const testPassword = "test-password";

const testUserIds = {
  superAdmin: "user-super",
  adminOne: "user-admin-one",
  adminTwo: "user-admin-two",
  member: "user-member",
  youngMember: "user-young",
  outsider: "user-outsider",
};

const testTokens = {
  superAdmin: "token-super",
  adminOne: "token-admin-one",
  adminTwo: "token-admin-two",
  member: "token-member",
  youngMember: "token-young",
  outsider: "token-outsider",
};

// Make test ages stay predictable instead of relying on fixed birth years.
function birthdateForAge(age) {
  return `${new Date().getFullYear() - age}-01-01`;
}

// Insert a small data set that contains only the relationships used by the tests.
async function seedTestData(passwordHash) {
  const database = getDatabase();
  const createdAt = "2026-09-01T09:00:00.000Z";

  await database.collection("users").insertMany([
    {
      id: testUserIds.superAdmin,
      username: "superadmin",
      email: "super@example.com",
      firstName: "Super",
      lastName: "Admin",
      birthdate: birthdateForAge(40),
      passwordHash,
      avatarUrl: null,
      systemRole: "superAdmin",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: testUserIds.adminOne,
      username: "adminone",
      email: "adminone@example.com",
      firstName: "Alice",
      lastName: "Admin",
      birthdate: birthdateForAge(35),
      passwordHash,
      avatarUrl: null,
      systemRole: "user",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: testUserIds.adminTwo,
      username: "admintwo",
      email: "admintwo@example.com",
      firstName: "Andrew",
      lastName: "Admin",
      birthdate: birthdateForAge(32),
      passwordHash,
      avatarUrl: null,
      systemRole: "user",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: testUserIds.member,
      username: "member",
      email: "member@example.com",
      firstName: "Mia",
      lastName: "Member",
      birthdate: birthdateForAge(25),
      passwordHash,
      avatarUrl: null,
      systemRole: "user",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: testUserIds.youngMember,
      username: "youngmember",
      email: "young@example.com",
      firstName: "Young",
      lastName: "Member",
      birthdate: birthdateForAge(15),
      passwordHash,
      avatarUrl: null,
      systemRole: "user",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: testUserIds.outsider,
      username: "outsider",
      email: "outsider@example.com",
      firstName: "Olivia",
      lastName: "Outsider",
      birthdate: birthdateForAge(28),
      passwordHash,
      avatarUrl: null,
      systemRole: "user",
      createdAt,
      updatedAt: createdAt,
    },
  ]);

  await database.collection("groups").insertMany([
    {
      id: "group-main",
      title: "Main Test Group",
      description: "A group used by the integration tests.",
      minimumAge: 13,
      colour: "#4FA3F5",
      memberIds: [
        testUserIds.adminOne,
        testUserIds.adminTwo,
        testUserIds.member,
        testUserIds.youngMember,
      ],
      adminIds: [testUserIds.adminOne, testUserIds.adminTwo],
      roomIds: ["room-main"],
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "group-single-admin",
      title: "Single Admin Group",
      description: "A group with one administrator.",
      minimumAge: 18,
      colour: "#E5B93F",
      memberIds: [testUserIds.adminOne],
      adminIds: [testUserIds.adminOne],
      roomIds: [],
      createdAt,
      updatedAt: createdAt,
    },
  ]);

  await database.collection("rooms").insertOne({
    id: "room-main",
    groupId: "group-main",
    name: "General",
    description: "The main test chat room.",
    createdBy: testUserIds.adminOne,
    createdAt,
    updatedAt: createdAt,
  });

  const messages = [];
  for (let messageNumber = 1; messageNumber <= 6; messageNumber++) {
    messages.push({
      id: `message-${messageNumber}`,
      roomId: "room-main",
      userId: testUserIds.member,
      type: "text",
      text: `Test message ${messageNumber}`,
      createdAt: `2026-09-01T09:0${messageNumber}:00.000Z`,
    });
  }
  await database.collection("messages").insertMany(messages);

  await database.collection("systemBans").insertOne({
    id: "system-ban-test",
    normalizedEmail: "banned@example.com",
    deletedUserId: "deleted-user",
    sourceRequestId: "request-old",
    reason: "Test ban",
    bannedAt: createdAt,
  });

  const sessions = Object.entries(testTokens).map(([userName, token]) => {
    return {
      token,
      userId: testUserIds[userName],
      createdAt,
    };
  });
  await database.collection("authSessions").insertMany(sessions);
}

export { seedTestData, testPassword, testTokens, testUserIds };
