import { FastifyInstance } from "fastify";
import { WhatsappController } from "@/modules/whatsapp/controller";
import { authenticate } from "@/middleware/auth.middleware";

export async function whatsappRoutes(fastify: FastifyInstance) {
  const controller = new WhatsappController();

  // All routes require authentication
  fastify.post(
    "/connect",
    {
      preHandler: [authenticate],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "5 minutes",
          errorResponseBuilder: () => ({
            success: false,
            error: {
              code: "TOO_MANY_REQUESTS",
              message: "Too many connection attempts. Please wait 5 minutes before trying again.",
            },
          }),
        },
      },
    },
    controller.connect
  );
  fastify.post("/disconnect", { preHandler: [authenticate] }, controller.disconnect);
  fastify.get("/status", { preHandler: [authenticate] }, controller.status);
  fastify.get("/qr", { preHandler: [authenticate] }, controller.qrStream);
}
