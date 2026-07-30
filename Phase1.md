# Fabulari - Phase 1

| Student detail | Information                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Name           | William Simons                                                                                            |
| Student number | s5398289                                                                                                  |
| Workshop       | Friday 10:00 AM                                                                                           |
| Repository     | [Fabulari Full Stack Development](https://github.com/William-JosephSimons/Fabulari-Fullstack-Development) |

## 1. Project overview

Fabulari is a role-based community chat application. Users will be able to
create their own accounts, browse groups, request group membership and
communicate in group rooms. Group Administrators will manage the groups they
belong to, while one Super Administrator will handle the small number of
system-wide request types.

Phase 1 focuses on the Angular interface, the main administration workflows and
a small Express server. Application data will be saved in a JSON file so that
changes survive a server restart. The chat screen will be a visual prototype in
this phase. MongoDB, live Socket.IO chat and image uploads will be completed in
Phase 2.

## 2. Requirements and assumptions

### 2.1 Functional requirements

| ID    | Area                    | Requirement                                                                                                                                 |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | First-run setup         | If there are no users, the application must allow the first and only Super Admin to be created. The setup option must disappear afterwards. |
| FR-02 | Registration            | Users create their own account with a unique username, unique email, first name, last name, age and password.                               |
| FR-03 | Login and logout        | Users log in with username and password. The current user is remembered locally and logout clears the saved session.                        |
| FR-04 | Permissions             | The interface shows actions appropriate to the current user, and protected server routes also check permission.                             |
| FR-05 | Private profile         | Users can view and edit their own profile. Email cannot be changed. Other users cannot open the full profile.                               |
| FR-06 | Group browsing          | Every authenticated user can browse every group, even if they are too young to join it.                                                     |
| FR-07 | Group creation          | A user requests a new group with a title, description, minimum age and colour. Super Admin approves or rejects the request.                 |
| FR-08 | Initial Group Admin     | When a group request is approved, the requester becomes the first Group Admin.                                                              |
| FR-09 | Membership              | Users request their own membership. A Group Admin approves or rejects the request after checking age and bans.                              |
| FR-10 | Admin continuity        | A group must always have at least one Group Admin. Another Group Admin can promote or demote an eligible member.                            |
| FR-11 | Direct group editing    | Group Admins directly edit the name, description, minimum age and colour of groups they administer.                                         |
| FR-12 | Age changes             | Raising a group's minimum age automatically removes existing members who are now too young.                                                 |
| FR-13 | Rooms                   | A group can have zero or more rooms. Group Admins directly create, edit and delete room details.                                            |
| FR-14 | Room proposals          | A regular member can propose a room. A Group Admin approves or rejects it, and rejection requires a reason.                                 |
| FR-15 | Room access             | Group membership gives access to every current and future room in that group.                                                               |
| FR-16 | Group presentation      | Rooms inherit their group's colour and minimum age. Groups do not have profile images.                                                      |
| FR-17 | Request records         | Requests store their type, requester, relevant target, reason, status, decision details and timestamps.                                     |
| FR-18 | Request history         | A requester can see pending and rejected requests. Pending requests cannot be cancelled.                                                    |
| FR-19 | Rejections              | Every rejected request must contain a visible reason.                                                                                       |
| FR-20 | Group deletion          | A Group Admin requests group deletion and only Super Admin can approve or reject it.                                                        |
| FR-21 | Group-ban report        | A permanent group ban requires a report. The person who submits it cannot approve it.                                                       |
| FR-22 | Permanent group ban     | A banned account cannot rejoin that group and there is no unban operation.                                                                  |
| FR-23 | System hard-ban request | Only a Group Admin can request complete deletion of a user account. Only Super Admin can decide the request.                                |
| FR-24 | Banned email            | After an approved system hard ban, the deleted email remains permanently blocked from registration.                                         |
| FR-25 | No invitations          | Group Admins cannot invite users. Users must request their own membership.                                                                  |
| FR-26 | Super Admin limits      | Super Admin cannot directly create groups, create/edit normal users, edit ordinary group settings or enter chat rooms.                      |
| FR-27 | Scoped user lists       | Group Admins see safe basic details for allowed and banned users in their own groups only.                                                  |
| FR-28 | System-wide views       | Super Admin can view permanent system-ban records and all audit logs.                                                                       |
| FR-29 | Audit logs              | Administrative and data-changing actions are logged. Ordinary message sends do not need an audit entry.                                     |
| FR-30 | Text chat               | Group members send and receive room text messages in real time.                                                                             |
| FR-31 | Image chat              | Group members can send PNG, JPEG and GIF images smaller than 2 MB.                                                                          |
| FR-32 | Presence                | A room displays join/leave notices and a live list of current participants.                                                                 |
| FR-33 | Message display         | Messages show a stable ID, sender name, profile image and timestamp. Current Group Admins are identified.                                   |
| FR-34 | Message history         | Entering a room loads the latest five persisted messages.                                                                                   |
| FR-35 | Message deletion        | Only the message creator can delete it, and the deletion is sent to connected room users.                                                   |
| FR-36 | Responsive interface    | The desktop-first interface must remain usable at tablet width and follow the committed storyboards.                                        |

### 2.2 Working assumptions

| Topic                    | Decision                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Username                 | Username is required because the marking criteria assess username/password login. It remains editable if the new value is unique.                     |
| Email                    | Email is the immutable account identifier and is stored in a normalized form for uniqueness and ban checks.                                           |
| Super Admin              | There is exactly one. It can only be created using first-run setup when no users exist.                                                               |
| Group Admin              | This is not a separate system role. A user is an admin when their ID appears in a group's admin id list.                                              |
| Room access              | There is no separate room assignment or invitation list. Access is derived from group membership.                                                     |
| Message limit            | Text messages will use a 2,000 character maximum as a reasonable technical safeguard.                                                                 |
| Latest five              | MongoDB will retain the latest five messages per room. A connected browser may temporarily display more messages received during its current session. |
| Owner-only deletion      | The instruction that users cannot delete items they did not create is applied to chat messages.                                                       |
| Hard deletion            | The active user and sessions are deleted, while a minimal normalized-email ban record remains.                                                        |
| Structured communication | Users can send supported requests to administrators but cannot freely message Super Admin.                                                            |

## 3. User roles

| Role        | Main abilities                                                                                                                                                                           | Main restrictions                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Super Admin | Complete first-run setup; decide group creation, group deletion and system hard-ban requests; view safe users, system bans and filtered audit logs.                                      | Cannot enter chat, directly create groups, maintain ordinary groups, or create/edit normal users.                                       |
| Group Admin | Chat normally; directly maintain administered groups and rooms; decide membership and room proposals; manage admins; view own-group user lists; submit deletion and system-ban requests. | Cannot delete a group directly, approve their own ban report, remove the final admin, invite users or view unrelated group memberships. |
| Normal User | Register, log in, edit their private profile, browse groups, request groups/membership, propose rooms, view request history and use eligible chat rooms.                                 | Cannot use administrator controls, request a system hard ban, cancel pending requests or join a group while under its age limit.        |

## 4. Git and GitHub strategy

The repository will keep a clear history of small, understandable changes.

- `main` will remain runnable and will be used for most Phase 1 work.
- A short feature branch may be used later for a risky change such as MongoDB migration or Socket.IO chat.
- Each commit will cover one logical change and use a direct message such as `add group creation requests`.
- Code, documentation and tests will be pushed at the end of each study session.
- Storyboards will be committed before the matching Angular pages.

The planned top-level structure is:

```text
Fabulari-Fullstack-Development/
  client/               Angular application
  server/               Express application and Phase 1 JSON data
  docs/storyboards/     Responsive interface designs
  fabulari-logo/        Original brand assets
  Phase1.md
  Phase2.md
  README.md
```

## 5. Proposed data structures

## 6. Proposed Angular architecture

## 7. Proposed Express API

## 8. Design documents

The storyboards will use the supplied Fabulari logo and a consistent blue/yellow/red/navy palette. Each main screen will have a desktop and tablet version. The planned set covers:

- first-run setup, login and registration
- Super Admin, Group Admin and Normal User dashboards
- private profile and request history
- group detail/settings and allowed/banned user lists
- room administration and request decisions
- audit logs
- chat messages, participant list, join/leave notices and Admin badges

The storyboard files will be added under `docs/storyboards` and linked here before the matching Angular pages are implemented.
