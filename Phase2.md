# Fabulari - Phase 2

| Student detail | Information                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Name           | William Simons                                                                                            |
| Student number | s5398289                                                                                                  |
| Workshop       | Friday 10:00 AM                                                                                           |
| Repository     | [Fabulari Full Stack Development](https://github.com/William-JosephSimons/Fabulari-Fullstack-Development) |

## 1. Specifications and requirements

Fabulari is a role-based community chat application built with Angular,
Express, Node.js, MongoDB and Socket.IO. It supports ordinary users, one Super
Admin and group-specific Group Admin access. The following table describes the
final application rather than only the changes made after Phase 1.

The phase column uses `P1` for work completed in Phase 1, `P1 + P2` when
Phase 2 migrated or extended existing work, and `P2` for functionality first
added in Phase 2.

### 1.1 Phase 2 additions

| Area                | Phase 1 position                       | Phase 2 work                                                                                  |
| ------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| Storage             | JSON file persistence                  | Native MongoDB driver, nine collections, indexes, a repeatable seed and restart persistence.  |
| Account data        | Stored age and local profile changes   | Birthdates, persistent profiles, verified password changes, profile images and self-deletion. |
| Authentication      | Current-user data in local storage     | Opaque MongoDB sessions used by REST and Socket.IO, plus logout and session restoration.      |
| Chat                | Static visual prototype                | Room messages, images, history, presence, notices, live deletion and Angular signals.         |
| Destructive actions | Basic JSON-backed request decisions    | Complete data, file and session cleanup plus immediate socket disconnection.                  |
| Larger lists        | Full lists loaded in one request       | Server search, paging, totals and Angular load-more controls.                                 |
| Accessibility       | Responsive forms and labelled controls | Live connection status, and chat input focus                                                  |

### 1.2 Final requirements

| ID    | Phase   | Area                    | Requirement                                                                                                                                             |
| ----- | ------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | P1 + P2 | First-run setup         | Setup creates the first and only Super Admin when the database contains no users. Later setup attempts are rejected.                                    |
| FR-02 | P1 + P2 | Registration            | A person registers their own user account with a unique username, unique email, names, birthdate and password.                                          |
| FR-03 | P1 + P2 | Login                   | A user logs in with their username and password. A successful login creates an opaque session token in MongoDB.                                         |
| FR-04 | P2      | Session restoration     | Angular checks the stored token with the server after a refresh and restores the current safe user when the session is valid.                           |
| FR-05 | P1 + P2 | Logout                  | Logout deletes the MongoDB session and removes the token and current user from local storage.                                                           |
| FR-06 | P1 + P2 | Permissions             | Angular guards protect page navigation, while Express and Socket.IO separately check every protected action.                                            |
| FR-07 | P1 + P2 | Private profile         | A user reads and edits only their own profile. Email stays fixed, and usernames remain unique.                                                          |
| FR-08 | P2      | Password change         | A user supplies their current password before replacing it with a new bcrypt password hash.                                                             |
| FR-09 | P2      | Profile image           | A user uploads a PNG, JPEG or GIF profile image smaller than 2 MB. The previous uploaded avatar is removed.                                             |
| FR-10 | P1 + P2 | Account deletion        | A user can permanently delete their own account unless they are the final Group Admin of a group. Self-deletion does not ban the email.                 |
| FR-11 | P1 + P2 | Group browsing          | Every authenticated user can browse the available groups, including groups they cannot join because of age or a ban.                                    |
| FR-12 | P1 + P2 | Group creation          | A user requests a group with a title, description, minimum age and colour. Only Super Admin decides the request.                                        |
| FR-13 | P1 + P2 | Initial Group Admin     | Approval creates the group and gives its requester Group Admin access for that group.                                                                   |
| FR-14 | P1 + P2 | Membership              | A user requests their own group membership. A Group Admin approves or rejects the request after age and ban checks.                                     |
| FR-15 | P1      | No invitations          | There is no invitation operation. Every user must request their own membership.                                                                         |
| FR-16 | P1 + P2 | Group Admin access      | Group Admin is derived from a group's `adminIds` and is not a third system role. A user can administer several groups.                                  |
| FR-17 | P1 + P2 | Admin continuity        | A Group Admin can promote an eligible member or demote another admin, but every group must retain at least one admin.                                   |
| FR-18 | P1 + P2 | Group settings          | A Group Admin directly edits the title, description, minimum age and colour of a group they administer.                                                 |
| FR-19 | P1 + P2 | Age changes             | Raising a minimum age removes members who are now too young and disconnects them from that group's live rooms.                                          |
| FR-20 | P1 + P2 | Room management         | A Group Admin directly creates, edits and deletes rooms. Room names are unique within their group.                                                      |
| FR-21 | P1 + P2 | Room proposals          | A group member proposes a room for a Group Admin to approve or reject. A rejection requires a reason.                                                   |
| FR-22 | P1 + P2 | Room access             | Membership gives access to every current and future room in the group. Rooms inherit the group's colour and age rule.                                   |
| FR-23 | P1 + P2 | Request records         | Requests store their type, requester, targets, reason, status, decision details and timestamps.                                                         |
| FR-24 | P1 + P2 | Request history         | Users see their pending and rejected requests. Pending requests cannot be cancelled.                                                                    |
| FR-25 | P1      | Rejections              | Every rejected request records and displays a reason.                                                                                                   |
| FR-26 | P1 + P2 | Group-ban report        | A permanent group ban starts with a report and must be approved by a different Group Admin.                                                             |
| FR-27 | P1 + P2 | Permanent group ban     | Approval removes the account from the group, disconnects its room sockets and permanently prevents it from rejoining.                                   |
| FR-28 | P1 + P2 | Group deletion          | A Group Admin requests deletion and only Super Admin decides it. Approval removes related rooms, messages, bans and requests.                           |
| FR-29 | P1 + P2 | System hard ban         | A Group Admin requests a system hard ban and only Super Admin decides it.                                                                               |
| FR-30 | P2      | Hard-ban cleanup        | Approval removes the account, sessions, memberships, avatars, retained messages and unresolved requests unless it would leave a group without an admin. |
| FR-31 | P1 + P2 | Banned email            | A minimal permanent record keeps the normalized email so the deleted account cannot register again.                                                     |
| FR-32 | P1 + P2 | Scoped user information | Group Admin user lists contain only the safe details needed to manage that group.                                                                       |
| FR-33 | P1 + P2 | System administration   | Super Admin views safe users, permanent system bans, pending system requests and filtered audit logs.                                                   |
| FR-34 | P1 + P2 | Audit logs              | Administrative and data-changing actions create audit records. Ordinary message sends do not.                                                           |
| FR-35 | P2      | Text chat               | Eligible members send text messages of up to 2,000 characters to one Socket.IO room.                                                                    |
| FR-36 | P2      | Image chat              | Eligible members upload PNG, JPEG or GIF chat images smaller than 2 MB.                                                                                 |
| FR-37 | P2      | Presence                | Each room shows a unique participant list plus first-connection join and final-connection leave notices.                                                |
| FR-38 | P2      | Chat identity           | The server supplies message sender details and current-group Admin badges instead of trusting client-provided identity.                                 |
| FR-39 | P2      | Message history         | MongoDB retains the newest five messages per room and returns them oldest-to-newest for display.                                                        |
| FR-40 | P2      | Message deletion        | Only the creator deletes a message. The server broadcasts the deletion and removes an uploaded image where applicable.                                  |
| FR-41 | P2      | Persistent storage      | Users, groups, rooms, requests, bans, audit logs, messages and login sessions persist in MongoDB.                                                       |
| FR-42 | P2      | Larger lists            | User, system-ban and audit-log routes support server search, paging, totals and incremental loading.                                                    |
| FR-43 | P1 + P2 | Validation              | Angular and the server validate important fields and return messages that explain how the user can recover.                                             |
| FR-44 | P1 + P2 | Responsive interface    | The interface remains usable at desktop and tablet widths.                                                                                              |

### 1.3 Roles and fixed decisions

| Topic              | Final decision                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| System roles       | `systemRole` contains only `user` and `superAdmin`. Exactly one Super Admin exists.                                               |
| Group Admin        | A user has Group Admin access when their ID is in a group's `adminIds`.                                                           |
| Birthdate          | Accounts store a birthdate. The server calculates age when it checks a group rule so stored ages cannot become stale.             |
| Public identifiers | Application records use readable string IDs. MongoDB's `_id` stays internal and is removed from responses.                        |
| Authentication     | HTTP requests use `Authorization: Bearer <token>`. Socket.IO sends the same token through `handshake.auth`.                       |
| Session storage    | MongoDB stores opaque random tokens. Local storage keeps the token and safe current-user record needed by Angular.                |
| Presence           | Presence stays in server memory because it describes current connections and resets after a restart.                              |
| Upload storage     | Image files stay under the local server's upload folders. MongoDB stores their public paths.                                      |
| Message retention  | Only the newest five messages per room persist. A currently connected browser may display additional messages until it refreshes. |
| Deletion           | Missing old image files do not make an otherwise successful database deletion fail.                                               |

### 1.4 Phase 2 MongoDB design

The application stores its data in a local MongoDB database named `fabulari`.

| Collection     | Main fields                                                                                          | Purpose                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `users`        | `id`, `username`, `email`, names, `birthdate`, `passwordHash`, `avatarUrl`, `systemRole`, timestamps | Stores active accounts.                                                      |
| `groups`       | `id`, `title`, `description`, `minimumAge`, `colour`, `memberIds`, `adminIds`, `roomIds`, timestamps | Stores group details and the IDs used for membership and Group Admin access. |
| `rooms`        | `id`, `groupId`, `name`, `description`, `createdBy`, timestamps                                      | Stores rooms separately while inheriting age and colour from the group.      |
| `requests`     | `id`, `type`, requester and target IDs, proposed data, reason, status, decision details, timestamps  | Stores actions that require an administrator's decision.                     |
| `groupBans`    | `id`, `groupId`, `bannedUserId`, `sourceRequestId`, `approvedBy`, `reason`, `bannedAt`               | Prevents a banned account from rejoining the same group.                     |
| `systemBans`   | `id`, `normalizedEmail`, `deletedUserId`, `sourceRequestId`, `reason`, `bannedAt`                    | Keeps the email required to block registration after deleting an account.    |
| `auditLogs`    | `id`, `actorId`, `actionType`, entity details, optional `groupId`, `summary`, `createdAt`            | Records administrative and data-changing actions.                            |
| `messages`     | `id`, `roomId`, `userId`, `type`, text or image path, `createdAt`                                    | Stores the latest five text or image messages for each room.                 |
| `authSessions` | `token`, `userId`, `createdAt`                                                                       | Connects a login token to an account so login survives a server restart.     |

MongoDB creates its own `_id` for each document, but I keep the
existing string `id` fields for routes and relationships. Groups,
rooms, requests and messages refer to related records by these string
IDs. Proposed group and room details stay inside their request
because they belong only to that request until approval.

The JSON file remains only as the readable source for demonstration data.
`npm run seed` clears the MongoDB collections and inserts that data again. The
running application does not read or write JSON state.

The database uses indexes for the fields that the server searches often. Public
IDs, usernames, emails, group titles, group room names, ban records and session
tokens are unique where required by the application rules. Other indexes support
request inboxes, audit-log filtering and room message history. Username, group
title and room-name indexes ignore differences in uppercase and lowercase text.
The indexes are created when the server starts.

## 2. Server API

The Angular client sends requests to `http://localhost:3000/api`. JSON
responses use `valid: true` for success. Expected validation and permission
failures use `valid: false` with a user-readable `message`.

Protected routes require an `Authorization` header containing
`Bearer <token>`. The server looks up that opaque token in `authSessions` and
then loads its user. It does not trust a user ID supplied by the client.

A safe user contains `id`, `username`, `email`, `firstName`, `lastName`,
`birthdate`, `avatarUrl`, `systemRole`, `createdAt` and `updatedAt`. Responses
never include the password hash or MongoDB `_id`.

Express serves uploaded files through `GET /uploads/avatars/<filename>` and
`GET /uploads/chat/<filename>`. MongoDB stores the relative upload path, and
Angular adds `http://localhost:3000` when it displays the file.

### 2.1 Account and profile routes

Account creation uses the following JSON fields:

| Field       | Type   | Validation                                                               |
| ----------- | ------ | ------------------------------------------------------------------------ |
| `username`  | string | Required, 3 to 30 characters and unique without regard to letter case.   |
| `email`     | string | Required, email-shaped, stored in lowercase, unique and not hard-banned. |
| `firstName` | string | Required.                                                                |
| `lastName`  | string | Required.                                                                |
| `birthdate` | string | Required `YYYY-MM-DD` date that produces an age from 1 to 120.           |
| `password`  | string | Required and at least 8 characters.                                      |

| Phase   | Method and route            | Access      | Request data                                     | Success response and effect                                                                                                            |
| ------- | --------------------------- | ----------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| P1 + P2 | `GET /api/bootstrap-status` | Public      | None                                             | `200` with `valid` and `setupRequired`. Setup is required only when the `users` collection is empty.                                   |
| P1 + P2 | `POST /api/bootstrap`       | Public once | Account creation JSON                            | `201` with `message` and safe `user`. Creates the only Super Admin and an `accountCreated` audit record.                               |
| P1 + P2 | `POST /api/register`        | Public      | Account creation JSON                            | `201` with `message` and safe `user`. Creates an ordinary user and an `accountCreated` audit record.                                   |
| P1 + P2 | `POST /api/login`           | Public      | `username`, `password`                           | `200` with `message`, safe `user` and `token`. Inserts an opaque random token into `authSessions`.                                     |
| P1 + P2 | `POST /api/logout`          | Logged in   | Bearer token                                     | `200` with `message`. Deletes the matching MongoDB session.                                                                            |
| P2      | `GET /api/session`          | Logged in   | Bearer token                                     | `200` with safe `user`. Removes the session and returns `401` if its account no longer exists.                                         |
| P1 + P2 | `GET /api/profile`          | Logged in   | Bearer token                                     | `200` with the current safe `user`.                                                                                                    |
| P1 + P2 | `PUT /api/profile`          | Logged in   | `username`, `firstName`, `lastName`, `birthdate` | `200` with `message` and updated safe `user`. Updates MongoDB and writes a `profileUpdated` audit record.                              |
| P1 + P2 | `DELETE /api/profile`       | Logged in   | Bearer token                                     | `200` with `message`. Deletes the user, sessions, memberships, messages, files, bans and requests, then writes an audit record.        |
| P2      | `PUT /api/profile/password` | Logged in   | `currentPassword`, `newPassword`                 | `200` with `message`. Verifies the current password, stores a new bcrypt hash and writes a `passwordChanged` audit record.             |
| P2      | `POST /api/profile/avatar`  | Logged in   | Multipart field named `avatar`                   | `200` with `message` and updated safe `user`. Stores the file, updates `avatarUrl`, removes the previous file and writes an audit log. |

Bootstrap returns `409` after any account exists. Registration returns `409`
until setup is complete, when a username or email already exists, or when the
email has been hard-banned. Account and profile validation failures return
`400`. Incorrect login details and invalid sessions return `401`. Profile
updates return `400` if an email change is attempted and `409` when another
account already uses the username. Account deletion returns `403` for the Super
Admin and `409` when the user is a group's final administrator.

Password changes return `400` for missing values or a new password shorter
than 8 characters. An incorrect current password returns `401`. Avatar uploads
accept PNG, JPEG and GIF files under 2 MB. A missing, empty, wrongly named,
wrongly typed or oversized upload returns `400`. The multipart route expects
one field named `avatar`.

### 2.2 Super Admin routes

Every route in this section requires a valid Super Admin session. A missing or
invalid session returns `401`. An ordinary user receives `403`.

The user, system-ban and audit-log routes accept `search`, `skip` and `limit`
query parameters. Search text is optional and can contain up to 100 characters.
When paging is supplied, `skip` must be zero or more and `limit` must be from 1
to 50. Invalid values return `400`. The response includes `total` before paging
and `hasMore` for the Angular load-more button.

| Phase   | Method and route             | Query data                                                | Success response and purpose                                                                                                                                        |
| ------- | ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 + P2 | `GET /api/admin/dashboard`   | None                                                      | `200` with `summary`: user, group, system-ban and pending-request counts, including a count for each Super Admin request type.                                      |
| P1 + P2 | `GET /api/admin/requests`    | None                                                      | `200` with newest-first pending group creation, group deletion and system-ban `requests`. Each record includes safe requester, group and target names where needed. |
| P1 + P2 | `GET /api/admin/users`       | `search`, `skip`, `limit`                                 | `200` with safe `users`, `total` and `hasMore`. Search checks username, email and first or last name. Users are ordered by username.                                |
| P1 + P2 | `GET /api/admin/system-bans` | `search`, `skip`, `limit`                                 | `200` with `systemBans`, `total` and `hasMore`. Search checks normalized email and reason. Bans are ordered newest-first.                                           |
| P1 + P2 | `GET /api/audit-logs`        | `actionType`, `startDate`, `endDate`, paging and `search` | `200` with `auditLogs`, available `actionTypes`, `total` and `hasMore`. Logs are ordered newest-first.                                                              |

Each safe user in `/api/admin/users` contains `id`, `username`, `email`, names,
calculated `age`, `avatarUrl` and `systemRole`. System-ban records contain the
normalized email, deleted account ID, request ID, reason and ban date. Audit
records contain their action, actor, affected entity, optional group, summary
and date. The audit response also adds `actorUsername` and `groupName`, using
"Deleted user" or "Deleted group" when the original record no longer exists.

Audit `search` checks the summary. `actionType` filters one action unless its
value is `all`. Dates use `YYYY-MM-DD` and include the whole start and end day.
Invalid dates or a start date after the end date return `400`.

### 2.3 Group and room routes

Every route in this section requires a valid login session. Route parameters
named `:id` contain a group or room string ID. A missing record returns `404`.
An authenticated account without the required group access receives `403`.

| Phase   | Method and route                        | Access          | Request data                                   | Success response and effect                                                                                                                             |
| ------- | --------------------------------------- | --------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 + P2 | `GET /api/groups`                       | Logged in       | None                                           | `200` with safe `groups`, the current user's membership `status`, `isAdmin` and an admin workload summary where applicable.                             |
| P1 + P2 | `PATCH /api/groups/:id`                 | Group Admin     | `title`, `description`, `minimumAge`, `colour` | `200` with `message`, updated `group` and `removedMemberCount`. It removes newly under-age members, writes an audit log and disconnects their sockets.  |
| P1 + P2 | `GET /api/groups/:id/users`             | Group Admin     | Group ID in the route                          | `200` with safe group details, alphabetical `members` and newest-first `bannedUsers`.                                                                   |
| P1 + P2 | `GET /api/groups/:id/rooms`             | Eligible member | Group ID in the route                          | `200` with safe `group` details and ordered `rooms`. The group response includes whether the current user is an admin.                                  |
| P1 + P2 | `POST /api/groups/:id/rooms`            | Group Admin     | `name`, `description`                          | `201` with `message` and new `room`. Adds its ID to the group and writes a `roomCreated` audit record.                                                  |
| P1 + P2 | `PATCH /api/rooms/:id`                  | Group Admin     | `name`, `description`                          | `200` with `message` and updated `room`. Updates its group timestamp and writes a `roomUpdated` audit record.                                           |
| P1 + P2 | `DELETE /api/rooms/:id`                 | Group Admin     | Room ID in the route                           | `200` with `message` and `roomId`. Deletes its messages and image files, removes its group reference, writes an audit log and disconnects room sockets. |
| P1 + P2 | `POST /api/groups/:id/join-requests`    | Ordinary user   | `reason`                                       | `201` with `message` and pending membership `request`. The requester is taken from the session.                                                         |
| P1 + P2 | `POST /api/groups/:id/admins`           | Group Admin     | `targetUserId`                                 | `200` with `message`, `groupId` and updated `adminIds`. Promotes an existing member and writes an audit log.                                            |
| P1 + P2 | `DELETE /api/groups/:id/admins/:userId` | Group Admin     | Target user ID in the route                    | `200` with `message`, `groupId` and updated `adminIds`. Demotes another admin and writes an audit log.                                                  |

The group list uses these membership status values:

| Status      | Meaning                                                    |
| ----------- | ---------------------------------------------------------- |
| `readOnly`  | The current account is Super Admin and cannot join groups. |
| `banned`    | The account has a permanent ban from this group.           |
| `member`    | The account is already a member.                           |
| `pending`   | The account has a pending membership request.              |
| `underAge`  | The account does not meet the group's current minimum age. |
| `available` | The account can submit a membership request.               |

Group settings require a title, description, whole-number minimum age from 0
to 120, and six-digit hexadecimal colour. Room names and descriptions are
required. Group titles are unique across the application, while room names are
unique only within their group. These duplicate conflicts return `409`.

Raising a group's minimum age cannot remove every Group Admin. Promotion is
limited to an existing member. Demotion cannot remove the final admin, target a
non-admin, or be used by an admin on themselves. These rule conflicts return
`403` or `409` with an explanation.

A membership request requires a reason. Super Admin cannot join a group, and a
user cannot request membership when under age, permanently banned, already a
member, or already waiting for a decision.

### 2.4 Request routes

All request routes derive the requester from the login session. Each new
request has a server-generated ID, `pending` status, creation time and empty
decision fields. The server also writes an audit record. There is no route for
cancelling a pending request.

A returned request contains `id`, `type`, `requesterId`, its relevant group,
target or proposed data, `reason`, `status`, `rejectionReason`, `decidedBy`,
`createdAt` and `decidedAt`. An approved creation or ban also records the ID of
the group, room or ban produced by that decision.

| Phase   | Method and route                           | Access          | Request data                                             | Success response and purpose                                                                                              |
| ------- | ------------------------------------------ | --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| P1 + P2 | `POST /api/group-requests`                 | Ordinary user   | `title`, `description`, `minimumAge`, `colour`, `reason` | `201` with `message` and group-creation `request`. The proposed group details remain inside the request until approval.   |
| P1 + P2 | `GET /api/requests/mine`                   | Logged in       | None                                                     | `200` with the current user's newest-first pending and rejected `requests`, plus safe group and target names.             |
| P1 + P2 | `GET /api/groups/:id/requests`             | Group Admin     | Group ID in the route                                    | `200` with safe `group` details and pending membership, room-proposal and group-ban `requests`, including names and ages. |
| P1 + P2 | `POST /api/groups/:id/room-requests`       | Eligible member | `name`, `description`, `reason`                          | `201` with `message` and room-proposal `request`.                                                                         |
| P1 + P2 | `POST /api/groups/:id/ban-reports`         | Group Admin     | `targetUserId`, `reason`                                 | `201` with `message` and group-ban-report `request`.                                                                      |
| P1 + P2 | `POST /api/groups/:id/delete-request`      | Group Admin     | `reason`                                                 | `201` with `message` and group-deletion `request`.                                                                        |
| P1 + P2 | `POST /api/groups/:id/system-ban-requests` | Group Admin     | `targetUserId`, `reason`                                 | `201` with `message` and system-hard-ban `request`.                                                                       |
| P1 + P2 | `PUT /api/requests/:id/decision`           | Relevant admin  | `decision`, optional `rejectionReason`                   | `200` with `message`, decided `request` and relevant `group`. Approval performs the action described in section 2.5.      |

A room proposal must come from an eligible member and cannot duplicate an
existing room or pending proposal in the same group. A group-ban report must
target a current member, cannot target its submitter, and cannot duplicate a
ban or pending report. Group deletion and system hard-ban requests also reject
duplicates. A hard-ban request must target another ordinary member of the
requester's group. Missing data returns `400`, missing groups return `404`, and
rule conflicts return `403` or `409`.

### 2.5 Request decisions

The decision body contains `decision`, which must be `approved` or `rejected`.
A rejection also requires `rejectionReason`. The route rejects missing,
unknown, or already-decided requests. It checks the current state again before
approval because membership, age, roles, names, or other records may have
changed since submission.

| Request type     | Decision-maker | Approval effect                                                                                                                                                        |
| ---------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groupCreation`  | Super Admin    | Creates a unique group, then makes the requester its first member and Group Admin.                                                                                     |
| `membership`     | Group Admin    | Adds the still-eligible, non-banned requester to the group.                                                                                                            |
| `roomProposal`   | Group Admin    | Creates the uniquely named room, adds it to the group and records the requester and approving admin.                                                                   |
| `groupBanReport` | Group Admin    | A different admin creates the permanent ban, removes the target's membership and admin access, and disconnects their sockets. The final Group Admin cannot be banned.  |
| `groupDeletion`  | Super Admin    | Deletes the group, rooms, retained messages, image files, group bans and other pending group requests. Connected room sockets are disconnected.                        |
| `systemBan`      | Super Admin    | Keeps the normalized banned email, then removes the account, sessions, messages, images, group bans, memberships, admin access and unresolved requests. Sockets close. |

System hard-ban approval is rejected if the target is the final administrator
of any group. Rejection changes no group, room, membership or ban data. Every
decision stores its status, rejection reason where applicable, deciding user
and decision time. It also writes an approval-specific audit record or a
`requestRejected` record.

### 2.6 Message routes

Chat uses REST for history, image uploads and deletion. All three routes require
a valid bearer token. Reading or uploading also requires an ordinary user who
is still a member and meets the group's current age rule.

| Phase | Method and route                     | Request data                  | Success response and effect                                                                                                                 |
| ----- | ------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| P2    | `GET /api/rooms/:id/messages`        | Room ID in the route          | `200` with the newest five retained `messages`, ordered oldest-to-newest for display and with current sender details.                       |
| P2    | `POST /api/rooms/:id/message-images` | Multipart field named `image` | `201` with `message` and saved `chatMessage`. Stores the image and message, trims older history, then broadcasts `message:new` to the room. |
| P2    | `DELETE /api/messages/:id`           | Message ID in the route       | `200` with `message`. The owner deletes the MongoDB record and image file where applicable, then the server broadcasts `message:deleted`.   |

Chat images accept PNG, JPEG and GIF files under 2 MB. Missing, empty, wrongly
named, wrongly typed or oversized uploads return `400`. The server removes a
newly written file when the room does not exist or the account lacks access.
Missing rooms or messages return `404`. Ineligible room access and attempts to
delete another user's message return `403`.

A message record uses the following fields:

| Field       | Meaning                                                       |
| ----------- | ------------------------------------------------------------- |
| `id`        | Server-generated stable message ID.                           |
| `roomId`    | Room receiving the message.                                   |
| `userId`    | Authenticated sender ID.                                      |
| `type`      | `text` or `image`.                                            |
| `text`      | Present on a text message.                                    |
| `imageUrl`  | Present on an image message.                                  |
| `createdAt` | Server-generated ISO timestamp.                               |
| `userName`  | Sender's current first name added for display.                |
| `initial`   | First letter used by the default avatar.                      |
| `avatarUrl` | Sender's current uploaded avatar path, or `null`.             |
| `isAdmin`   | Whether the sender currently administers the message's group. |

MongoDB keeps only the newest five messages in each room. After saving a text
or image message, the server removes every older record and deletes any trimmed
image file. Connected browsers can show more than five live messages until
they refresh because trimming does not remove already displayed messages. Chat
messages do not create audit records.

### 2.7 Socket connection and room handling

Angular connects to `http://localhost:3000` and sends the stored opaque token
as `handshake.auth.token`. Socket.IO middleware checks the token before it
allows the connection. An invalid token produces a `connect_error`; the normal
room events are not registered for that socket.

After connecting, the client asks to join `room:<roomId>`. The server loads the
current user, room and group from MongoDB. It rejects a missing room, Super
Admin account, non-member or user who no longer meets the minimum age. The
server leaves the socket's previous Fabulari room before joining a different
one, and ignores a duplicate join for the same room.

Presence is an in-memory array of socket connections and resets when the server
restarts. Several tabs for one account count as one participant. The server
sends `presence:joined` when that account's first tab enters and
`presence:left` when its final tab leaves. Every join or leave also broadcasts
the complete deduplicated participant list through `presence:state`.

### 2.8 Client socket events

| Event          | Data object        | Validation and purpose                                                                                            |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `room:join`    | `{ roomId }`       | Checks the current MongoDB user, room, group membership and minimum age before joining the room.                  |
| `room:leave`   | `{ roomId }`       | Leaves only when the supplied ID matches the socket's current room.                                               |
| `message:send` | `{ roomId, text }` | Requires the socket to have joined that room. Text is trimmed, must not be empty and has a 2,000-character limit. |

Before saving a text message, the server checks the user, room, group,
membership and age again. It creates the ID, timestamp, sender information and
current-group Admin flag. It then saves the message, trims older history and
broadcasts `message:new` only to `room:<roomId>`, including the sender.

### 2.9 Server socket events

| Event             | Data object                | Client use                                                                              |
| ----------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| `message:new`     | Complete safe message      | Adds a saved text or image message to the current room display.                         |
| `message:deleted` | `{ roomId, messageId }`    | Removes the matching message from every connected room client.                          |
| `presence:state`  | `{ roomId, participants }` | Replaces the participant list with the server's current state.                          |
| `presence:joined` | `{ roomId, participant }`  | Adds a temporary join notice when an account's first connection enters.                 |
| `presence:left`   | `{ roomId, participant }`  | Adds a temporary leave notice when an account's final connection leaves.                |
| `socket:error`    | `{ message }`              | Displays a friendly room or message error that does not close the socket automatically. |

A participant contains `userId`, `name`, `initial`, `avatarUrl` and `isAdmin`.
The Admin value belongs to the current group rather than being a system role.
Join and leave notices exist only in the current browser and are not stored as
messages.

The Angular Socket service also listens for Socket.IO's built-in `connect`,
`disconnect` and `connect_error` events. The Chat component uses these to show
its connection status, clear stale participants, and rejoin the selected room
after a reconnect. It unsubscribes from every Observable, leaves the room and
disconnects when Angular destroys the component.

## 3. Angular components, services and models

Each component keeps its
TypeScript, HTML and CSS together under `client/src/app/components`. Services
hold HTTP or Socket.IO communication, while components keep page state and
respond to the service results.

The same phase labels used in the requirements table appear below. Most page
layouts began in Phase 1 and were connected to MongoDB or live data in Phase 2.

### 3.1 Root component and routed pages

| Route                            | Component             | Phase   | Responsibility                                                                                   |
| -------------------------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| application root                 | `App`                 | P1 + P2 | Hosts the router and checks a stored session when Angular starts.                                |
| `/setup`                         | `FirstRunSetup`       | P1 + P2 | Checks bootstrap status and creates the only Super Admin when setup is available.                |
| `/login`                         | `Login`               | P1 + P2 | Sends username/password login and stores the returned safe user and token.                       |
| `/register`                      | `Register`            | P1 + P2 | Validates matching passwords and creates an ordinary user account.                               |
| `/user-dashboard`                | `UserDashboard`       | P1 + P2 | Summarises the current user's groups and recent request history.                                 |
| `/group-admin-dashboard`         | `GroupAdminDashboard` | P1 + P2 | Lists groups the current user administers and their pending decision counts.                     |
| `/super-admin-dashboard`         | `SuperAdminDashboard` | P1 + P2 | Displays system totals and pending Super Admin request counts.                                   |
| `/groups`                        | `Groups`              | P1 + P2 | Searches groups and submits group-creation or membership requests.                               |
| `/groups/:groupId`               | `GroupDetail`         | P1 + P2 | Displays accessible rooms and allows a member to propose a room.                                 |
| `/groups/:groupId/admin`         | `RoomManagement`      | P1 + P2 | Maintains settings, members, admins, rooms, reports and deletion requests for one group.         |
| `/groups/:groupId/requests`      | `GroupRequests`       | P1 + P2 | Displays and decides the selected group's membership, room and ban requests.                     |
| `/groups/:groupId/rooms/:roomId` | `Chat`                | P1 + P2 | Replaces the Phase 1 mock chat with retained messages, live presence and text or image messages. |
| `/requests`                      | `Requests`            | P1 + P2 | Displays the current user's pending and rejected request history.                                |
| `/profile`                       | `Profile`             | P1 + P2 | Loads and saves the private profile, password and profile image, and confirms account deletion.  |
| `/admin/requests`                | `AdminRequests`       | P1 + P2 | Displays and decides pending group creation, group deletion and system-ban requests.             |
| `/admin/users`                   | `AdminUsers`          | P1 + P2 | Searches and incrementally loads safe users and permanent system bans.                           |
| `/admin/audit-logs`              | `AuditLogs`           | P1 + P2 | Searches, filters and incrementally loads administrative audit records.                          |

The empty path redirects to `/login`. Parameter routes appear before the
general group route because Angular uses the first matching route. The wildcard
route remains last and redirects unknown paths to login.

### 3.2 Shared navigation components

| Component              | Phase | Responsibility                                                                           |
| ---------------------- | ----- | ---------------------------------------------------------------------------------------- |
| `AuthNavigation`       | P1    | Displays the logo plus login and registration navigation.                                |
| `MainNavigation`       | P1    | Displays user, Group Admin, group, request, profile and logout navigation.               |
| `SuperAdminNavigation` | P1    | Displays the separate Super Admin dashboard, request, user, audit and logout navigation. |

The main navigation deliberately includes both User and Group Administrator
dashboards because Group Admin is an attribute of an ordinary user account.

### 3.3 Services

| Service   | Phase   | Responsibility                                                                                                                             |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Auth`    | P1 + P2 | Sends setup, registration, login, logout, session, profile, password, avatar and account-deletion requests. It also manages local storage. |
| `Group`   | P1 + P2 | Sends group, member, admin, room, proposal, moderation and message HTTP requests.                                                          |
| `Request` | P1 + P2 | Loads personal, group and Super Admin inboxes and sends request decisions.                                                                 |
| `Admin`   | P1 + P2 | Loads the Super Admin dashboard plus paged user and system-ban records.                                                                    |
| `Audit`   | P1 + P2 | Sends action, date, search and paging values when loading audit logs.                                                                      |
| `Socket`  | P2      | Connects with the stored token, emits room/message events and exposes incoming Socket.IO events as Observables.                            |

Every HTTP service uses Angular `HttpClient`. Protected calls obtain the bearer
header from `Auth`, which keeps token handling in one place. Image methods use
`FormData` because Multer receives multipart uploads rather than JSON.

Phase 1 created the routed page shells, navigation and the first HTTP services.
Phase 2 kept that structure. It added MongoDB session restoration to `App` and
`Auth`, persistent profile and image operations, the `Socket` service, live
chat state, and paged administration lists.

### 3.4 Guard, forms and live state

`authGuard` requires both a stored safe user and token. It checks the required
system role from route data and redirects a user to the correct dashboard when
they try to open a page for the other role. Express still performs the final
permission check because local-storage values can be changed in the browser.

Forms use `FormsModule` and `ngModel`. Components disable important actions
while requests are running and display success, validation, empty and server
error states. URL parameters are read through `ActivatedRoute.paramMap`.

`Chat` receives Socket.IO events through Observable subscriptions. Angular
signals hold the current messages, participants and connection state. The
component unsubscribes, leaves the room and disconnects its socket when Angular
destroys it.

### 3.5 Models

The application does not use separate Angular model or interface files. It uses
the JSON objects returned by Express directly. Variables use arrays and objects
with descriptive names, while MongoDB collection fields are documented in
section 1.4.

## 4. Design documents

The following storyboards were created in Phase 1 and remain the design
baseline for the final application:

- [Authentication screens](docs/storyboards/authentication_screens_storyboard.png)
- [Dashboards](docs/storyboards/dashboards_storyboard.png)
- [Group browsing](docs/storyboards/group_browsing_storyboard.png)
- [Profile and requests](docs/storyboards/profile_requests_storyboard.png)
- [Group administration](docs/storyboards/group_administration_storyboard.png)
- [System administration](docs/storyboards/system_administration_storyboard.png)
- [Chat and presence](docs/storyboards/chat_presence_storyboard.png)

Phase 2 keeps the page structure from these storyboards. The chat storyboard
shows the message list, image control, participant list, join and leave notices,
Admin badges and owner-only deletion. The final page keeps that structure while
adding the Fabulari colours, live connection status and responsive behaviour.

The other storyboards also keep their original page structure. Phase 2 adds
colour, loading states, validation messages and incremental loading without
changing the navigation or main content shown in those designs.

## 5. Testing

The suites contain 11 server integration tests, 10 Angular unit tests and six
Cypress end-to-end tests. All three suites pass on my local machine.

### 5.1 Tools and method

The server tests use Mocha to run the tests, Chai for assertions and Chai HTTP
to send requests to the real Express routes. They use the local MongoDB
`fabulari_test` database, not the development `fabulari` database. Before each
test, a small set of users, groups, rooms, messages and sessions is inserted.
The test helper clears the test collections before the next test and after the
suite finishes. It checks the database name before clearing anything.

The server tests check HTTP responses and, where relevant, the records saved in
MongoDB. A small fake Socket.IO object records broadcasts made by HTTP routes.
This checks that a route requested the right broadcast; it does not test a live
socket connection.

The Auth service tests use Angular's HTTP
testing controller to inspect requests without contacting the server. Guard
and Profile tests supply small fake services with `vi.fn()`. The Profile tests
render the component to check its read-only email field and call its form
methods to check validation errors.

Cypress runs user journeys through the Angular pages against the real Express
server and the separate `fabulari_e2e` MongoDB database. A shared `beforeEach`
hook runs the seed script before every test, so one test's database changes
cannot affect the next. The chat test uses one Cypress browser and a second Socket.IO client
started by a Cypress task. This checks live room broadcasts between two
connections, although Cypress does not control two browser windows in that
test.

### 5.2 Running the tests

Start the local MongoDB service before the server or Cypress tests. The server
and Angular unit tests do not need the application servers running. From the
repository root, run each command in its own package:

```
cd server
npm test
```

```
cd client
npm test
```

The expected results are 11 passing server tests and 10 passing Angular tests.
The server tests clear `fabulari_test`, so that database should only contain
test data.

Cypress needs the E2E server and Angular client running in separate terminals.
Run these commands from the repository root:

```text
cd server
npm run e2e:start
```

```text
cd client
npm start
```

Then, in a third terminal:

```text
cd client
npm run e2e:run
```

This runs the six tests in Cypress's Electron browser. The Cypress hook seeds `fabulari_e2e` automatically before each test. Do not use `npm run seed`
for this, since that command replaces the normal development database. The
E2E server must use `npm run e2e:start`, not `npm run dev`, so it connects to
`fabulari_e2e`.

### 5.3 Server integration tests

| ID  | Test                                                                                                                 | Result |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| B01 | First-run setup creates one Super Admin and rejects a second attempt.                                                | Pass   |
| B02 | Registration rejects an email on the permanent system-ban list, regardless of letter case.                           | Pass   |
| B03 | Login creates a stored session, while a private profile rejects missing authentication and returns no password hash. | Pass   |
| B04 | Raising a group's minimum age removes an under-age member while retaining eligible administrators.                   | Pass   |
| B05 | A Group Admin creates a room; a second room with the same name in different letter case is rejected.                 | Pass   |
| B06 | The final Group Admin cannot be demoted.                                                                             | Pass   |
| B07 | Super Admin approval of a group request creates the group with its requester as member and first administrator.      | Pass   |
| B08 | A ban-report submitter cannot approve their own report; another Group Admin can.                                     | Pass   |
| B09 | An eligible member receives the latest five stored messages in display order; a non-member is denied.                | Pass   |
| B10 | A non-owner cannot delete a message; owner deletion removes it and requests a room broadcast.                        | Pass   |
| B11 | Self-deletion removes the user, their sessions and messages, and their group membership.                             | Pass   |

These tests are in [`server/test/api.test.js`](server/test/api.test.js). The data
set is in [`server/test/test-data.js`](server/test/test-data.js).

### 5.4 Angular unit tests

| ID  | Test                                                                           | Result |
| --- | ------------------------------------------------------------------------------ | ------ |
| A01 | Auth stores and restores the safe user and token and builds the bearer header. | Pass   |
| A02 | Auth requires both stored values for a login and clears both values.           | Pass   |
| A03 | Logout sends the token to the server and clears local storage.                 | Pass   |
| A04 | The guard sends a visitor without a complete login to the login page.          | Pass   |
| A05 | The guard sends a normal user away from a Super Admin route.                   | Pass   |
| A06 | The guard permits a user whose role matches the route.                         | Pass   |
| A07 | Profile loads account details and keeps the email field read only.             | Pass   |
| A08 | Profile rejects an invalid birthdate before making an update request.          | Pass   |
| A09 | Profile rejects a non-image file before upload.                                | Pass   |
| A10 | Successful account deletion clears local login data and returns to login.      | Pass   |

These tests are in the Auth service, auth guard and Profile component `*.spec.ts`
files. They do not require a running server or MongoDB.

### 5.5 End-to-end testing

| ID  | Test                                                                                                            | Result |
| --- | --------------------------------------------------------------------------------------------------------------- | ------ |
| E01 | A visitor is sent to login; a user logs in, survives refresh, cannot open Super Admin pages and logs out.       | Pass   |
| E02 | A wrong password gives a useful message without creating a local session.                                       | Pass   |
| E03 | A user requests a group; Super Admin approves it; the requester sees the group and Group Admin access.          | Pass   |
| E04 | A Group Admin approves a room proposal, then creates, edits and deletes another room.                           | Pass   |
| E05 | A Group Admin promotes and demotes a member, then raises the age limit and sees under-age removals.             | Pass   |
| E06 | Two room connections exchange text, an image and presence notices; owner controls and latest-five history work. | Pass   |

These tests are in [`client/cypress/e2e`](client/cypress/e2e). The shared reset
hook is in [`client/cypress/support/e2e.ts`](client/cypress/support/e2e.ts), and
the database and second-chat-client tasks are in
[`client/cypress.config.ts`](client/cypress.config.ts).
