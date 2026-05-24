import { FastifyInstance } from "fastify";
import { DashboardController } from "@/modules/dashboard/controller";
import { authenticate } from "@/middleware/auth.middleware";

export async function dashboardRoutes(fastify: FastifyInstance) {
  const controller = new DashboardController();

  // All routes require authentication
  fastify.get("/", { preHandler: [authenticate] }, controller.getDashboard);
}
