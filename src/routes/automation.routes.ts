import { FastifyInstance } from "fastify";
import { AutomationController } from "@/modules/automation/controller";
import { authenticate } from "@/middleware/auth.middleware";

export async function automationRoutes(fastify: FastifyInstance) {
  const controller = new AutomationController();

  // All routes require authentication
  fastify.get("/", { preHandler: [authenticate] }, controller.list);
  fastify.post("/", { preHandler: [authenticate] }, controller.create);
  fastify.put("/:id", { preHandler: [authenticate] }, controller.update);
  fastify.delete("/:id", { preHandler: [authenticate] }, controller.delete);
  fastify.patch("/:id/toggle", { preHandler: [authenticate] }, controller.toggle);
}
