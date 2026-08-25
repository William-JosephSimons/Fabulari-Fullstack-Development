# Fabulari - Phase 1

| Student detail | Information                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Name           | William Simons                                                                                            |
| Student number | s5398289                                                                                                  |
| Workshop       | Friday 10:00 AM                                                                                           |
| Repository     | [Fabulari Full Stack Development](https://github.com/William-JosephSimons/Fabulari-Fullstack-Development) |

## 1. Project overview

Fabulari is a role-based community chat application. Users can create their
own accounts, browse groups and request group membership. Users with Group
Admin access manage their groups. One Super Admin handles the system-wide
request types.

Phase 1 contains the Angular interface, the administration workflows and a
small Express server. A JSON file keeps application data after a server
restart. The chat screen is a visual prototype.

## 2. Requirements and assumptions

### 2.1 Functional requirements

| ID    | Area                    | Requirement                                                                                                                      |
| ----- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | First-run setup         | If no users exist, first-run setup creates the first and only Super Admin and then becomes unavailable.                          |
| FR-02 | Registration            | Users create their own account with a unique username, unique email, first name, last name, age and password.                    |
| FR-03 | Login and logout        | Users log in with username and password. The Auth service stores the current user locally, and logout removes that data.         |
| FR-04 | Permissions             | The interface shows actions appropriate to the current user, and protected server routes also check permission.                  |
| FR-05 | Private profile         | Users can view and edit their own profile. Email stays fixed, and other users cannot open the full profile.                      |
| FR-06 | Group browsing          | Every authenticated user can browse every group, even if they are too young to join it.                                          |
| FR-07 | Group creation          | A user requests a new group with a title, description, minimum age and colour. Super Admin approves or rejects the request.      |
| FR-08 | Initial Group Admin     | When a group request is approved, the requester receives Group Admin access for the new group.                                   |
| FR-09 | Membership              | Users request their own membership. A user with Group Admin access approves or rejects the request after checking age and bans.  |
| FR-10 | Admin continuity        | A group always has at least one user with Group Admin access. Another Group Admin user can promote or demote an eligible member. |
| FR-11 | Direct group editing    | Users with Group Admin access directly edit the name, description, minimum age and colour of groups they administer.             |
| FR-12 | Age changes             | Raising a group's minimum age automatically removes existing members who are now too young.                                      |
| FR-13 | Rooms                   | A group can have zero or more rooms. Users with Group Admin access directly create, edit and delete room details.                |
| FR-14 | Room proposals          | A regular member can propose a room. A Group Admin user approves or rejects it, and rejection requires a reason.                 |
| FR-15 | Room access             | Group membership gives access to every current and future room in that group.                                                    |
| FR-16 | Group presentation      | Rooms inherit their group's colour and minimum age. Groups do not have profile images.                                           |
| FR-17 | Request records         | Requests store their type, requester, relevant target, reason, status, decision details and timestamps.                          |
| FR-18 | Request history         | A requester can see pending and rejected requests. Pending requests cannot be cancelled.                                         |
| FR-19 | Rejections              | Every rejected request contains a visible reason.                                                                                |
| FR-20 | Group deletion          | A Group Admin user requests group deletion and only Super Admin can approve or reject it.                                        |
| FR-21 | Group-ban report        | A permanent group ban requires a report. The person who submits it cannot approve it.                                            |
| FR-22 | Permanent group ban     | A banned account cannot rejoin that group and there is no unban operation.                                                       |
| FR-23 | System hard-ban request | Only a Group Admin user can request complete deletion of a user account. Only Super Admin can decide the request.                |
| FR-24 | Banned email            | After an approved system hard ban, the deleted email remains permanently blocked from registration.                              |
| FR-25 | No invitations          | Users with Group Admin access cannot invite users. Users must request their own membership.                                      |
| FR-26 | Super Admin limits      | Super Admin cannot directly create groups, create/edit user accounts, edit ordinary group settings or enter chat rooms.          |
| FR-27 | Scoped user lists       | Users with Group Admin access see safe basic details for allowed and banned users in their own groups only.                      |
| FR-28 | System-wide views       | Super Admin can view permanent system-ban records and all audit logs.                                                            |
| FR-29 | Audit logs              | The server logs administrative and data-changing actions. Ordinary message sends do not need an audit entry.                     |
| FR-30 | Text chat               | Group members send and receive room text messages in real time.                                                                  |
| FR-31 | Image chat              | Group members can send PNG, JPEG and GIF images smaller than 2 MB.                                                               |
| FR-32 | Presence                | A room displays join/leave notices and a live list of current participants.                                                      |
| FR-33 | Message display         | Messages show a stable ID, sender name, profile image and timestamp. Current users with Group Admin access are identified.       |
| FR-34 | Message history         | Entering a room loads the latest five persisted messages.                                                                        |
| FR-35 | Message deletion        | Only the message creator can delete it, and the server sends the deletion to connected room users.                               |
| FR-36 | Responsive interface    | The desktop-first interface remains usable at tablet width and follows the committed storyboards.                                |

### 2.2 Working assumptions

| Topic                    | Decision                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Username                 | The marking criteria require username/password login. Username remains editable when the new value is unique.                                     |
| Email                    | Email is the immutable account identifier. The server stores it in normalized form for uniqueness and ban checks.                                 |
| Super Admin              | There is exactly one. First-run setup creates it only when no users exist.                                                                        |
| Group Admin access       | This is not a system role. A user has this access when their ID appears in a group's `adminIds` list.                                             |
| Room access              | There is no separate room assignment or invitation list. Group membership determines room access.                                                 |
| Message limit            | Text messages use a 2,000 character maximum as a reasonable technical safeguard.                                                                  |
| Latest five              | MongoDB retains the latest five messages per room. A connected browser may temporarily display more messages received during its current session. |
| Owner-only deletion      | The rule against deleting another user's work applies to chat messages.                                                                           |
| Hard deletion            | Approval deletes the active user and sessions but keeps a minimal normalized-email ban record.                                                    |
| Structured communication | Users can send supported requests to administrators but cannot freely message Super Admin.                                                        |

## 3. Account roles and group administration

The `systemRole` field has two values.

| System role  | Main abilities                                                                                                               | Main restrictions                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `superAdmin` | Completes first-run setup, decides system requests, and views safe users, permanent bans and filtered audit logs.            | Cannot enter chat, directly create groups, maintain ordinary groups or create/edit user accounts. |
| `user`       | Registers, logs in, edits their profile, browses groups, sends requests, views request history and uses eligible chat rooms. | Cannot use system administration, cancel pending requests or join a group below its age limit.    |

Group Admin is an attribute of the `user` role, not a third role. A user has
Group Admin access for a group when their ID appears in that group's `adminIds`
array. That user can maintain the group and its rooms, manage admins, decide
group-level requests, view the group's user lists, and submit deletion or
system-ban requests. They cannot delete the group directly, approve their own
ban report, remove the final admin, invite users or view unrelated memberships.

## 4. Git and GitHub strategy

The repository keeps a clear history of small, understandable changes.

- `main` remains runnable and contains the Phase 1 work.
- Short feature branches handle risky changes such as the MongoDB migration or Socket.IO chat.
- Each commit covers one logical change and uses a direct message such as
  `add group creation requests`.
- I push code and documentation and the end of each study session.
- The storyboards appear in the history before the matching Angular pages.

The top-level structure is:
```text
Fabulari-Fullstack-Development/
  client/               Angular application
  server/               Express application and Phase 1 JSON data
  docs/storyboards/     Interface designs
  fabulari-logo/        Original brand assets
  Phase1.md
  Phase2.md
  README.md
```

## 5. Data structures and JSON persistence

The server state is stored in `server/data/fabulari.json`. The `loadData()` function reads and parses the whole file. `saveData()` rewrites it with readable indentation after an administrative or data-changing action. If the file does not exist, `data.js` creates the folder and an empty state containing all seven arrays.

IDs are strings and timestamps use ISO date strings. Related records refer to each other by ID rather than copying full objects.

| JSON array   | Main fields                                                                                                   | Purpose                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `users`      | `id`, `username`, `email`, names, `age`, `passwordHash`, `avatarUrl`, `systemRole`, timestamps                | Stores active accounts. The server omits password hashes from Angular responses.      |
| `groups`     | `id`, `title`, `description`, `minimumAge`, `colour`, `memberIds`, `adminIds`, `roomIds`, timestamps          | Stores group details and the IDs used to derive membership, administration and rooms. |
| `rooms`      | `id`, `groupId`, `name`, `description`, `createdBy`, timestamps                                               | Stores rooms separately. The application reads age and colour from the owning group.  |
| `requests`   | `id`, `type`, `requesterId`, related IDs or proposed data, `reason`, `status`, decision fields and timestamps | Stores each action that needs an administrator decision.                              |
| `groupBans`  | `id`, `groupId`, `bannedUserId`, `sourceRequestId`, `approvedBy`, `reason`, `bannedAt`                        | Stops the same account from requesting membership of that group again.                |
| `systemBans` | `id`, `normalizedEmail`, `deletedUserId`, `sourceRequestId`, `reason`, `bannedAt`                             | Keeps the minimum record needed to block a deleted account's email permanently.       |
| `auditLogs`  | `id`, `actorId`, `actionType`, entity details, optional `groupId`, `summary`, `createdAt`                     | Records account, request, group, room and moderation changes.                         |

Requests share the status and decision fields, while a few fields depend on the request type.

| Request type     | Extra data                | Decision maker   |
| ---------------- | ------------------------- | ---------------- |
| `groupCreation`  | `proposedGroup`           | Super Admin      |
| `membership`     | `groupId`                 | Group Admin user |
| `roomProposal`   | `groupId`, `proposedRoom` | Group Admin user |
| `groupBanReport` | `groupId`, `targetUserId` | Group Admin user |
| `groupDeletion`  | `groupId`                 | Super Admin      |
| `systemBan`      | `groupId`, `targetUserId` | Super Admin      |

## 6. Angular architecture

Each page keeps its TypeScript, HTML and CSS in its own folder under `components`. Services and the route guard use their own folders under `services` and `guards` respectively.

### 6.1 Routed pages

`client/src/app/app.routes.ts` defines the routes. Parameter routes come before the general group route because Angular uses the first match.

| Route                            | Component             | Responsibility                                               |
| -------------------------------- | --------------------- | ------------------------------------------------------------ |
| `/setup`                         | `FirstRunSetup`       | Displays the first Super Admin setup page.                   |
| `/login`                         | `Login`               | Displays username and password login.                        |
| `/register`                      | `Register`            | Displays user registration.                                  |
| `/user-dashboard`                | `UserDashboard`       | Summarises the current user's groups and requests.           |
| `/group-admin-dashboard`         | `GroupAdminDashboard` | Selects an administered group and shows pending decisions.   |
| `/super-admin-dashboard`         | `SuperAdminDashboard` | Summarises system totals and Super Admin requests.           |
| `/groups`                        | `Groups`              | Browses groups and submits membership or group requests.     |
| `/groups/:groupId`               | `GroupDetail`         | Lists the rooms available to a member of the selected group. |
| `/groups/:groupId/admin`         | `RoomManagement`      | Manages the selected group's settings, members and rooms.    |
| `/groups/:groupId/rooms/:roomId` | `Chat`                | Displays the selected room's chat and presence prototype.    |
| `/groups/:groupId/requests`      | `GroupRequests`       | Displays the selected group's Group Admin request inbox.     |
| `/requests`                      | `Requests`            | Displays the current user's personal request history.        |
| `/profile`                       | `Profile`             | Reads and updates the current user's localStorage profile.   |
| `/admin/requests`                | `AdminRequests`       | Displays the Super Admin request inbox.                      |
| `/admin/users`                   | `AdminUsers`          | Displays the safe user and permanent system-ban page.        |
| `/admin/audit-logs`              | `AuditLogs`           | Displays the Super Admin audit-log page.                     |

An empty path redirects to `/login`. The wildcard route is last and redirects unknown URLs to `/login`.

### 6.2 Shared navigation components

| Component              | Used by                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `AuthNavigation`       | First-run setup, login and registration.                     |
| `MainNavigation`       | User, group administration, profile, request and chat pages. |
| `SuperAdminNavigation` | Super Admin dashboard, requests, users and audit logs.       |

The three navigation components share the logo and common styles. Their links change for authentication, user and Super Admin pages. A user who administers
one or more groups can move between the User dashboard and Group Administrator dashboard.

### 6.3 Angular services

| Service   | Responsibility                                                                  |
| --------- | ------------------------------------------------------------------------------- |
| `Auth`    | Setup, registration, login and current-user localStorage.                       |
| `Group`   | Group browsing, settings, users, rooms, membership, proposals, bans and admins. |
| `Request` | Personal history, administrator inboxes and request decisions.                  |
| `Admin`   | Super Admin dashboard totals, safe user list and permanent system bans.         |
| `Audit`   | Audit-log loading with action and date filters.                                 |

## 7. Express API

Most responses contain `valid`, an optional `message`, and the data requested
by the page. The current user ID is sent from local storage. The route then
looks up that account and checks its role, group membership or `adminIds` list.

### 7.1 Public and current-user routes

| Method | Route                   | Access or purpose                                                        |
| ------ | ----------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/bootstrap-status` | Reports whether the first account still needs to be created.             |
| POST   | `/api/bootstrap`        | Creates the only Super Admin when there are no users.                    |
| POST   | `/api/register`         | Creates a user account after uniqueness and banned-email checks.         |
| POST   | `/api/login`            | Checks the bcrypt password and returns a safe user without its hash.     |
| GET    | `/api/groups`           | Returns browsable groups and the requesting user's derived access state. |
| POST   | `/api/group-requests`   | Lets a user request a new group.                                         |
| GET    | `/api/requests/mine`    | Returns the requester's pending and rejected history.                    |

Logout and profile editing happen in localStorage.

### 7.2 Group and room routes

| Method | Route                                 | Required access or action                                            |
| ------ | ------------------------------------- | -------------------------------------------------------------------- |
| PATCH  | `/api/groups/:id`                     | A Group Admin user updates settings and applies age removals.        |
| GET    | `/api/groups/:id/users`               | A Group Admin user receives safe member and banned-user lists.       |
| GET    | `/api/groups/:id/rooms`               | Eligible member receives the group's details and rooms.              |
| POST   | `/api/groups/:id/rooms`               | A Group Admin user creates a uniquely named room.                    |
| PATCH  | `/api/rooms/:id`                      | A Group Admin user updates a room.                                   |
| DELETE | `/api/rooms/:id`                      | A Group Admin user deletes a room and removes its ID from the group. |
| POST   | `/api/groups/:id/join-requests`       | User requests their own eligible membership.                         |
| POST   | `/api/groups/:id/room-requests`       | Eligible member proposes a room.                                     |
| POST   | `/api/groups/:id/admins`              | A Group Admin user promotes an existing member.                      |
| DELETE | `/api/groups/:id/admins/:userId`      | A Group Admin user demotes another admin while keeping one admin.    |
| GET    | `/api/groups/:id/requests`            | A Group Admin user receives pending group-level requests.            |
| POST   | `/api/groups/:id/ban-reports`         | A Group Admin user submits a ban report about a current member.      |
| POST   | `/api/groups/:id/delete-request`      | A Group Admin user requests deletion of the group.                   |
| POST   | `/api/groups/:id/system-ban-requests` | A Group Admin user requests a system hard ban for a current member.  |

### 7.3 Super Admin, decisions and audit routes

| Method | Route                        | Required access or action                                                |
| ------ | ---------------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/admin/dashboard`       | Super Admin receives current system and pending-inbox totals.            |
| GET    | `/api/admin/requests`        | Super Admin receives pending creation, deletion and system-ban requests. |
| GET    | `/api/admin/users`           | Super Admin receives an explicitly safe active-user list.                |
| GET    | `/api/admin/system-bans`     | Super Admin receives permanent banned-email records.                     |
| GET    | `/api/audit-logs`            | Super Admin filters audit logs by action type and date.                  |
| PUT    | `/api/requests/:id/decision` | The correct administrator approves or rejects a pending request.         |

The decision route checks the request type before it applies the action. It
also requires every rejection reason, blocks a ban-report submitter from
approving their own report, and records the result in the audit log.

## 8. Design documents

The storyboards use the supplied Fabulari logo and a black-and-white
style. Users who administer groups can access both the User dashboard
and Group Administrator dashboard. The set covers:

- first-run setup, login and registration
- Super Admin, user and group administration dashboards
- private profile and request history
- group detail/settings and allowed/banned user lists
- room administration and request decisions
- safe users and permanent system-ban records
- audit logs
- chat messages, participant list, join/leave notices and Admin badges

The storyboard images are stored under `docs/storyboards`:

- [Authentication screens](docs/storyboards/authentication_screens_storyboard.png)
- [Dashboards](docs/storyboards/dashboards_storyboard.png)
- [Group browsing](docs/storyboards/group_browsing_storyboard.png)
- [Profile and requests](docs/storyboards/profile_requests_storyboard.png)
- [Group administration](docs/storyboards/group_administration_storyboard.png)
- [System administration](docs/storyboards/system_administration_storyboard.png)
- [Chat and presence](docs/storyboards/chat_presence_storyboard.png)
