# Repository inspection and incremental plan

The starting repository was clean. This is a CommonJS Node.js 22 application launched by `node server` or `nodemon server`. Express serves HTML/CSS/browser ES modules directly. There was no Docker configuration, PostgreSQL/Prisma, active Kafka/BullMQ infrastructure, or test script.

## Existing ownership

- User: username/email/password hash, profile, avatar metadata, last seen. Express sessions use MongoDB through connect-mongo.
- Rooms: visibility, invite-code hash, roles, membership/read cursors, ownership, latest activity, archival state.
- Message: room/user reference, text, replies, reactions, edits, deletion actor/type/timestamps.
- DirectConversation: unique participant pair, unread/read state, latest-message metadata.
- DirectMessage: sender/conversation, text, edits/deletion.

REST uses controllers/services and authentication/room-role middleware. Registration lives directly in authRoutes.js. Room sends persisted in sockets/handlers/sendMessage.js; DM sends already delegate to directMessageRealTimeService.js. Room administrative mutations live in controllers. These are the smallest places to add explicit event capture without changing client contracts.

Socket registration lives in chatSocket.js and directMessageSocket.js. Contracts include room join/send/edit/delete/react, message/history/activity/read/typing/user events, and DM join/send/read/presence/typing events. WebRTC offer/answer/ICE/end signaling remains direct through directCallSignaling.js.

The unified inbox is served for /rooms, /chat, /messages; older frontend modules remain. utils/users.js, presence, and call tracking use process-local state. Redis adapter/client dependencies were installed but unused. The similarly named socket authentication files perform different responsibilities and both remain.

## Implementation sequence

1. PostgreSQL identity references, preferences/audits, Prisma migration, repositories/services, optional API connection, Compose.
2. Versioned allowlisted events, MongoDB infrastructure outbox, background Kafka relay; extract room-message persistence.
3. Independent notification, analytics, and audit consumer groups on one domain topic.
4. Redis-backed BullMQ queues and service-driven workers with database deduplication.
5. Stable BullMQ schedulers with explicit timezone and configurable digest/cleanup schedules.
6. Administrative event audit records and message notification jobs/preferences.
7. Unit, syntax, and isolated live integration checks; document actual limits and commands.

## Deliberate compromises

The original application did not require a MongoDB replica set. The outbox is retryable after capture but not atomic with preceding mutations. Requiring transactions across all existing mutation paths would be a more disruptive change; the crash window is documented in the README.

One background runner keeps operations understandable. Individual role commands aid learning/debugging, not a microservices migration. Presence/WebRTC stay direct Socket.IO traffic and retain the existing single-API-process constraint. Existing chat schemas and user credentials remain in MongoDB.
