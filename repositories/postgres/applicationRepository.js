function createRepository(db) {
  async function account(mongoUserId, tx = db) {
    if (!/^[a-f\d]{24}$/i.test(mongoUserId)) throw new TypeError("Invalid MongoDB identity reference");
    return tx.userAccount.upsert({ where: { mongoUserId }, update: {}, create: { mongoUserId } });
  }
  async function preferences(mongoUserId, changes = {}) {
    return db.$transaction(async tx => {
      const user = await account(mongoUserId, tx);
      return tx.notificationPreference.upsert({ where: { userId: user.id },
        create: { userId: user.id, ...changes }, update: changes });
    });
  }
  async function once(consumer, eventId, action) {
    return db.$transaction(async tx => {
      const claimed = await tx.processedEvent.createMany({ data: [{ consumer, eventId }], skipDuplicates: true });
      if (!claimed.count) return false;
      await action(tx);
      return true;
    });
  }
  async function audit(event) {
    return once("audit", event.eventId, async tx => {
      const actor = await account(event.data.actorUserId, tx);
      await tx.auditLog.create({ data: { eventId: event.eventId, actorUserId: actor.id,
        action: event.eventType, entityType: event.data.messageId ? "message" : "room",
        entityId: event.data.messageId || event.data.roomId,
        metadata: event.data, createdAt: new Date(event.occurredAt) } });
    });
  }
  async function analytics(event) {
    return once("analytics", event.eventId, async tx => {
      if (event.eventType === "user.created") await account(event.data.actorUserId, tx);
      const day = new Date(event.occurredAt.slice(0, 10));
      await tx.dailyMetric.upsert({ where: { day_eventType: { day, eventType: event.eventType } },
        create: { day, eventType: event.eventType, count: 1 }, update: { count: { increment: 1 } } });
    });
  }
  async function notification(data) {
    return once("notification-job", data.key, async tx => {
      const user = await account(data.mongoUserId, tx);
      await tx.notification.create({ data: { key: data.key, userId: user.id, eventId: data.eventId,
        kind: data.kind, entityId: data.entityId, expiresAt: new Date(Date.now() + 30 * 86400000) } });
    });
  }
  async function email(data) {
    return once("email-job", data.key, async tx => {
      const user = await account(data.mongoUserId, tx);
      await tx.emailDelivery.create({ data: { key: data.key, userId: user.id,
        template: data.template, payload: { count: data.count || 0 } } });
    });
  }
  const digestUsers = (cursor) => db.userAccount.findMany({
    where: { preference: { dailyDigest: true } }, orderBy: { id: "asc" }, take: 100,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  const notificationCount = (userId, start, end) => db.notification.count({ where: { userId, createdAt: { gte: start, lt: end } } });
  const cleanup = () => db.notification.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const listNotifications = mongoUserId => db.notification.findMany({ where: { user: { mongoUserId } }, orderBy: { createdAt: "desc" }, take: 50 });
  return { account, preferences, once, audit, analytics, notification, email, digestUsers, notificationCount, cleanup, listNotifications };
}
module.exports = { createRepository };
