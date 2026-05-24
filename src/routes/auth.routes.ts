import { FastifyInstance } from "fastify";
import { AuthController } from "@/modules/auth/controller";
import { authenticate } from "@/middleware/auth.middleware";

export async function authRoutes(fastify: FastifyInstance) {
  const controller = new AuthController();

  fastify.post("/signup", controller.signup);
  fastify.post("/login", controller.login);
  fastify.post("/logout", controller.logout);
  fastify.get("/me", { preHandler: [authenticate] }, controller.me);
}
