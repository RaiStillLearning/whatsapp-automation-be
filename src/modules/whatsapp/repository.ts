import prisma from "@/lib/prisma";

export class WhatsappRepository {
  async upsertSession(userId: string, data: { status?: string; phone?: string }) {
    return prisma.whatsappSession.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        status: data.status || "disconnected",
        phone: data.phone || null,
      },
      update: {
        status: data.status,
        phone: data.phone,
      },
    });
  }

  async getSession(userId: string) {
    return prisma.whatsappSession.findUnique({
      where: { user_id: userId },
    });
  }

  async updateStatus(userId: string, status: string) {
    return prisma.whatsappSession.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        status,
      },
      update: {
        status,
      },
    });
  }

  async updatePhone(userId: string, phone: string) {
    return prisma.whatsappSession.update({
      where: { user_id: userId },
      data: { phone },
    });
  }

  async getAllAuthenticatedSessions() {
    return prisma.whatsappSession.findMany({
      where: { status: "authenticated" },
    });
  }

  async deleteSession(userId: string) {
    return prisma.whatsappSession.deleteMany({
      where: { user_id: userId },
    });
  }
}
