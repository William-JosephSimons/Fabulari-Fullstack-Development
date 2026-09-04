# Fabulari - Phase 2

| Student detail | Information                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Name           | William Simons                                                                                            |
| Student number | s5398289                                                                                                  |
| Workshop       | Friday 10:00 AM                                                                                           |
| Repository     | [Fabulari Full Stack Development](https://github.com/William-JosephSimons/Fabulari-Fullstack-Development) |

## 1. Specifications and requirements

Fabulari is a role-based community chat application. The requirements and
assumptions stated for Phase 1 still apply. Phase 2 completes the chat
features and replaces prototype behaviour with the final MEAN application.

| ID    | Requirement                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------ |
| P2-01 | Group members send and receive text messages in real time.                                             |
| P2-02 | Messages are sent only to users connected to the selected room.                                        |
| P2-03 | Super Admin cannot connect to a group chat room.                                                       |
| P2-04 | The server checks group membership and age eligibility before allowing a room connection.              |
| P2-05 | A room displays its current participants and reports when a user joins or leaves.                      |
| P2-06 | The participant list identifies users who have Group Admin access in the current group.                |
| P2-07 | Messages show a stable ID, sender, profile image and timestamp.                                        |
| P2-08 | Group members can send PNG, JPEG and GIF images smaller than 2 MB.                                     |
| P2-09 | Entering a room loads the latest five stored messages.                                                 |
| P2-10 | Only the creator of a message can delete it, and connected room members see that deletion immediately. |
| P2-11 | User accounts store a birthdate, and the server calculates the current age when applying age rules.     |

### 1.1 MongoDB design

Phase 2 stores application data in a MongoDB database named `fabulari`. The
existing JSON arrays map to separate collections so the current relationships
and route behaviour do not need to be redesigned during the change.

| Collection     | Main fields                                                                                                      | Purpose                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `users`        | `id`, `username`, `email`, names, `birthdate`, `passwordHash`, `avatarUrl`, `systemRole`, timestamps             | Stores active accounts.                               |
| `groups`       | `id`, `title`, `description`, `minimumAge`, `colour`, `memberIds`, `adminIds`, `roomIds`, timestamps             | Stores group details and the IDs used for membership and Group Admin access.    |
| `rooms`        | `id`, `groupId`, `name`, `description`, `createdBy`, timestamps                                                  | Stores rooms separately while inheriting age and colour from the group.         |
| `requests`     | `id`, `type`, requester and target IDs, proposed data, reason, status, decision details, timestamps             | Stores actions that require an administrator's decision.                        |
| `groupBans`    | `id`, `groupId`, `bannedUserId`, `sourceRequestId`, `approvedBy`, `reason`, `bannedAt`                           | Prevents a banned account from rejoining the same group.                        |
| `systemBans`   | `id`, `normalizedEmail`, `deletedUserId`, `sourceRequestId`, `reason`, `bannedAt`                                | Keeps the email required to block registration after deleting an account.       |
| `auditLogs`    | `id`, `actorId`, `actionType`, entity details, optional `groupId`, `summary`, `createdAt`                        | Records administrative and data-changing actions.                              |
| `messages`     | `id`, `roomId`, `userId`, `type`, text or image path, `createdAt`                                                | Stores the latest five text or image messages for each room.                    |
| `authSessions` | `token`, `userId`, `createdAt`                                                                                   | Connects a login token to an account so login survives a server restart. |

MongoDB creates its own `_id` for each document, but I keep the
existing string `id` fields for routes and relationships. Groups, 
rooms, requests and messages refer to related records by these string 
IDs. Proposed group and room details stay inside their request 
because they belong only to that request until approval.

The current JSON file remains as the source of the demonstration data while
MongoDB is introduced. After every route uses MongoDB, the server stops reading
and writing from the JSON file.

## 2. Server API

The existing REST endpoints are documented in `Phase1.md`.

### 2.1 Client events

| Event          | Data             | Purpose                                   |
| -------------- | ---------------- | ----------------------------------------- |
| `room:join`    | `roomId`         | Requests access to a chat room.           |
| `room:leave`   | `roomId`         | Leaves the current chat room.             |
| `message:send` | `roomId`, `text` | Sends a text message to the current room. |

### 2.2 Server events

| Event             | Data                  | Purpose                                                     |
| ----------------- | --------------------- | ----------------------------------------------------------- |
| `message:new`     | Safe message record   | Adds a message to the room.                                 |
| `message:deleted` | Message ID            | Removes a deleted message from connected clients.           |
| `presence:state`  | Safe participant list | Replaces the client's current participant list.             |
| `presence:joined` | Safe participant      | Reports that a participant joined.                          |
| `presence:left`   | Safe participant      | Reports that a participant left.                            |
| `socket:error`    | Friendly message      | Reports a rejected connection, room action or chat message. |

The server creates the sender details, Admin flag, message ID and timestamp.
The client cannot choose those values.

## 3. Angular components, services and models

The existing Angular components/services are documented in `Phase1.md`.
Modifications/Additions include:

| Item     | Type      | Responsibility                                                                                     |
| -------- | --------- | -------------------------------------------------------------------------------------------------- |
| `Chat`   | Component | Displays room messages and participants, sends messages, and subscribes to incoming events.        |
| `Socket` | Service   | Connects and disconnects Socket.IO, emits client events, and exposes server events as Observables. |

The socket service keeps connection code out of the component. This also
avoids registering the same event-handling code in more than one page. The
component unsubscribes when the user leaves the chat page.

## 4. Design documents

The existing [chat and presence storyboard](docs/storyboards/chat_presence_storyboard.png)
already shows the message list, image control, participant list, join and leave
notices, Admin badges and owner-only deletion. It does not need to change for
the socket implementation.

The other Phase 1 storyboards remain part of the application design and will be
updated only if Phase 2 changes their structure.

## 5. Testing

Testing tools and automated-test results will be documented after the Week 10
testing material is taught and the tests have been written.
