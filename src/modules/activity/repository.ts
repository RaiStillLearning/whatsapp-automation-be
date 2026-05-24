import prisma from "@/lib/prisma";

export class ActivityLogRepository {
  async create(userId: string, eventType: string, metadata?: Record<string, any>) {
    return prisma.activityLog.create({
      data: {
        user_id: userId,
        event_type: eventType,
        metadata: metadata ?? undefined,
      },
    });
  }

  async getRecent(userId: string, limit: number = 10) {
    return prisma.activityLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  }

  async countByEventType(userId: string, eventType: string, since?: Date) {
    return prisma.activityLog.count({
      where: {
        user_id: userId,
        event_type: eventType,
        ...(since ? { created_at: { gte: since } } : {}),
      },
    });
  }
}
