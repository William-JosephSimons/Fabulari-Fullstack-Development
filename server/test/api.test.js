import bcrypt from "bcryptjs";
import * as chai from "chai";
import chaiHttp, { request } from "chai-http";
import { getDatabase } from "../database.js";
import {
  clearTestDatabase,
  closeTestDatabase,
  connectTestDatabase,
  createTestApp,
} from "./test-helpers.js";
import {
  seedTestData,
  testPassword,
  testTokens,
  testUserIds,
} from "./test-data.js";

chai.use(chaiHttp);
const { expect } = chai;
const { app, io } = createTestApp();
let passwordHash;

// These tests use the real routes and a separate local MongoDB database.
describe("API integration tests", function () {
  this.timeout(10000);

  before(async function () {
    passwordHash = await bcrypt.hash(testPassword, 10);
    await connectTestDatabase();
  });

  beforeEach(async function () {
    await clearTestDatabase();
    await seedTestData(passwordHash);
    io.emittedEvents.length = 0;
  });

  after(async function () {
    await closeTestDatabase();
  });

  it("creates exactly one Super Admin during first-run setup", async function () {
    await clearTestDatabase();
    const accountDetails = {
      username: "firstadmin",
      email: "firstadmin@example.com",
      firstName: "First",
      lastName: "Admin",
      birthdate: "1990-01-01",
      password: testPassword,
    };

    const firstResponse = await request
      .execute(app)
      .post("/api/bootstrap")
      .send(accountDetails);
    const secondResponse = await request
      .execute(app)
      .post("/api/bootstrap")
      .send(accountDetails);

    expect(firstResponse).to.have.status(201);
    expect(firstResponse.body.user.systemRole).to.equal("superAdmin");
    expect(firstResponse.body.user).not.to.have.property("passwordHash");
    expect(secondResponse).to.have.status(409);
    expect(await getDatabase().collection("users").countDocuments()).to.equal(
      1,
    );
  });

  it("rejects registration with a permanently banned email", async function () {
    const response = await request.execute(app).post("/api/register").send({
      username: "bannedperson",
      email: "BANNED@example.com",
      firstName: "Banned",
      lastName: "Person",
      birthdate: "2000-01-01",
      password: testPassword,
    });

    expect(response).to.have.status(409);
    expect(response.body.message).to.equal(
      "That email cannot be used to register.",
    );
  });

  it("creates a session after login and protects private profiles", async function () {
    const deniedResponse = await request.execute(app).get("/api/profile");
    const loginResponse = await request.execute(app).post("/api/login").send({
      username: "member",
      password: testPassword,
    });
    const profileResponse = await request
      .execute(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${loginResponse.body.token}`);

    expect(deniedResponse).to.have.status(401);
    expect(loginResponse).to.have.status(200);
    expect(loginResponse.body.token).to.be.a("string").and.not.be.empty;
    expect(profileResponse).to.have.status(200);
    expect(profileResponse.body.user.id).to.equal(testUserIds.member);
    expect(profileResponse.body.user).not.to.have.property("passwordHash");
    expect(
      await getDatabase()
        .collection("authSessions")
        .findOne({ token: loginResponse.body.token }),
    ).not.to.equal(null);
  });

  it("removes members who become too young after a group age change", async function () {
    const response = await request
      .execute(app)
      .patch("/api/groups/group-main")
      .set("Authorization", `Bearer ${testTokens.adminOne}`)
      .send({
        title: "Main Test Group",
        description: "Updated test group.",
        minimumAge: 18,
        colour: "#4FA3F5",
      });
    const group = await getDatabase()
      .collection("groups")
      .findOne({ id: "group-main" });

    expect(response).to.have.status(200);
    expect(response.body.removedMemberCount).to.equal(1);
    expect(group.memberIds).not.to.include(testUserIds.youngMember);
    expect(group.adminIds).to.include.members([
      testUserIds.adminOne,
      testUserIds.adminTwo,
    ]);
  });

  it("lets a Group Admin create a room but rejects a duplicate name", async function () {
    const roomDetails = {
      name: "Ideas",
      description: "Discuss new ideas.",
    };
    const createdResponse = await request
      .execute(app)
      .post("/api/groups/group-main/rooms")
      .set("Authorization", `Bearer ${testTokens.adminOne}`)
      .send(roomDetails);
    const duplicateResponse = await request
      .execute(app)
      .post("/api/groups/group-main/rooms")
      .set("Authorization", `Bearer ${testTokens.adminOne}`)
      .send({ ...roomDetails, name: "ideas" });

    expect(createdResponse).to.have.status(201);
    expect(createdResponse.body.room).not.to.have.property("minimumAge");
    expect(createdResponse.body.room).not.to.have.property("colour");
    expect(duplicateResponse).to.have.status(409);
  });

  it("prevents removal of a group's final administrator", async function () {
    const response = await request
      .execute(app)
      .delete(`/api/groups/group-single-admin/admins/${testUserIds.adminOne}`)
      .set("Authorization", `Bearer ${testTokens.adminOne}`);

    expect(response).to.have.status(409);
    expect(response.body.message).to.equal(
      "A group must always have at least one Group Admin.",
    );
  });

  it("creates a group after the Super Admin approves its request", async function () {
    const requestResponse = await request
      .execute(app)
      .post("/api/group-requests")
      .set("Authorization", `Bearer ${testTokens.outsider}`)
      .send({
        title: "New Test Group",
        description: "A requested group.",
        minimumAge: 18,
        colour: "#FF6366",
        reason: "There is interest in this topic.",
      });
    const decisionResponse = await request
      .execute(app)
      .put(`/api/requests/${requestResponse.body.request.id}/decision`)
      .set("Authorization", `Bearer ${testTokens.superAdmin}`)
      .send({ decision: "approved", rejectionReason: "" });
    const group = await getDatabase()
      .collection("groups")
      .findOne({ title: "New Test Group" });

    expect(requestResponse).to.have.status(201);
    expect(decisionResponse).to.have.status(200);
    expect(group.memberIds).to.deep.equal([testUserIds.outsider]);
    expect(group.adminIds).to.deep.equal([testUserIds.outsider]);
  });

  it("requires a different Group Admin to approve a ban report", async function () {
    const reportResponse = await request
      .execute(app)
      .post("/api/groups/group-main/ban-reports")
      .set("Authorization", `Bearer ${testTokens.adminOne}`)
      .send({
        targetUserId: testUserIds.member,
        reason: "Repeated rule breaking.",
      });
    const requestId = reportResponse.body.request.id;
    const ownDecisionResponse = await request
      .execute(app)
      .put(`/api/requests/${requestId}/decision`)
      .set("Authorization", `Bearer ${testTokens.adminOne}`)
      .send({ decision: "approved", rejectionReason: "" });
    const otherDecisionResponse = await request
      .execute(app)
      .put(`/api/requests/${requestId}/decision`)
      .set("Authorization", `Bearer ${testTokens.adminTwo}`)
      .send({ decision: "approved", rejectionReason: "" });
    const groupBan = await getDatabase()
      .collection("groupBans")
      .findOne({ groupId: "group-main", bannedUserId: testUserIds.member });

    expect(reportResponse).to.have.status(201);
    expect(ownDecisionResponse).to.have.status(403);
    expect(otherDecisionResponse).to.have.status(200);
    expect(groupBan.approvedBy).to.equal(testUserIds.adminTwo);
  });

  it("returns only the latest five room messages in display order", async function () {
    const response = await request
      .execute(app)
      .get("/api/rooms/room-main/messages")
      .set("Authorization", `Bearer ${testTokens.member}`);
    const outsiderResponse = await request
      .execute(app)
      .get("/api/rooms/room-main/messages")
      .set("Authorization", `Bearer ${testTokens.outsider}`);

    expect(response).to.have.status(200);
    expect(response.body.messages.map((message) => message.id)).to.deep.equal([
      "message-2",
      "message-3",
      "message-4",
      "message-5",
      "message-6",
    ]);
    expect(outsiderResponse).to.have.status(403);
  });

  it("allows only the message owner to delete and broadcasts the removal", async function () {
    const deniedResponse = await request
      .execute(app)
      .delete("/api/messages/message-1")
      .set("Authorization", `Bearer ${testTokens.adminOne}`);
    const deletedResponse = await request
      .execute(app)
      .delete("/api/messages/message-1")
      .set("Authorization", `Bearer ${testTokens.member}`);
    const storedMessage = await getDatabase()
      .collection("messages")
      .findOne({ id: "message-1" });

    expect(deniedResponse).to.have.status(403);
    expect(deletedResponse).to.have.status(200);
    expect(storedMessage).to.equal(null);
    expect(io.emittedEvents.at(-1)).to.deep.equal({
      roomName: "room:room-main",
      eventName: "message:deleted",
      data: {
        roomId: "room-main",
        messageId: "message-1",
      },
    });
  });

  it("removes a deleted user from related application data", async function () {
    const response = await request
      .execute(app)
      .delete("/api/profile")
      .set("Authorization", `Bearer ${testTokens.member}`);
    const database = getDatabase();
    const deletedUser = await database
      .collection("users")
      .findOne({ id: testUserIds.member });
    const remainingSessions = await database
      .collection("authSessions")
      .countDocuments({ userId: testUserIds.member });
    const remainingMessages = await database
      .collection("messages")
      .countDocuments({ userId: testUserIds.member });
    const group = await database
      .collection("groups")
      .findOne({ id: "group-main" });

    expect(response).to.have.status(200);
    expect(deletedUser).to.equal(null);
    expect(remainingSessions).to.equal(0);
    expect(remainingMessages).to.equal(0);
    expect(group.memberIds).not.to.include(testUserIds.member);
  });
});
