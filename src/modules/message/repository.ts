import prisma from "@/lib/prisma";

export class MessageLogRepository {
  async create(data: {
    wa_message_id: string;
    user_id: string;
    contact_name: string | null;
    contact_number: string;
    message_body: string;
    direction: string;
    is_automated?: boolean;
    rule_id?: string | null;
  }) {
    return prisma.messageLog.create({ data });
  }

  async existsByWaMessageId(waMessageId: string) {
    const existing = await prisma.messageLog.findUnique({
      where: { wa_message_id: waMessageId },
    });
    return !!existing;
  }

  async countTodayAutomated(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return prisma.messageLog.count({
      where: {
        user_id: userId,
        is_automated: true,
        direction: "outgoing",
        created_at: { gte: startOfDay },
      },
    });
  }

  async countTodayIncoming(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return prisma.messageLog.count({
      where: {
        user_id: userId,
        direction: "incoming",
        created_at: { gte: startOfDay },
      },
    });
  }

  async getRecent(userId: string, limit: number = 20) {
    return prisma.messageLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  }
}
