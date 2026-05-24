import prisma from "@/lib/prisma";

export class AutomationRepository {
  async create(data: { user_id: string; keyword: string; reply: string }) {
    return prisma.automationRule.create({ data });
  }

  async findByUserId(userId: string) {
    return prisma.automationRule.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
  }

  async getActiveByUserId(userId: string) {
    return prisma.automationRule.findMany({
      where: { user_id: userId, is_active: true },
      orderBy: { created_at: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.automationRule.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: { keyword?: string; reply?: string; is_active?: boolean }) {
    return prisma.automationRule.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.automationRule.delete({
      where: { id },
    });
  }

  async countByUserId(userId: string) {
    return prisma.automationRule.count({
      where: { user_id: userId },
    });
  }

  async countActiveByUserId(userId: string) {
    return prisma.automationRule.count({
      where: { user_id: userId, is_active: true },
    });
  }

  async findByKeyword(userId: string, keyword: string) {
    return prisma.automationRule.findFirst({
      where: {
        user_id: userId,
        keyword: { equals: keyword, mode: "insensitive" },
      },
    });
  }
}
