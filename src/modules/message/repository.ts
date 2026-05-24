import prisma from "@/lib/prisma";

export class MessageLogRepository {
  async create(data: {
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

  async existsByWaMessageId(userId: string, contactNumber: string, messageBody: string) {
    // Check for duplicate by matching user + contact + body in last 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const existing = await prisma.messageLog.findFirst({
      where: {
        user_id: userId,
        contact_number: contactNumber,
        message_body: messageBody,
        direction: "incoming",
        created_at: { gte: fiveSecondsAgo },
      },
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
