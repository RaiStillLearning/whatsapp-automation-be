import prisma from "@/lib/prisma";
import { SignupInput } from "./schema";

export class AuthRepository {
  async createUser(data: SignupInput & { password_hash: string }) {
    return prisma.user.create({
      data: {
        email: data.email,
        password_hash: data.password_hash,
        name: data.name,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }
}
