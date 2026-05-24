import { FastifyInstance } from "fastify";
import { AuthController } from "@/modules/auth/controller";
import { authenticate } from "@/middleware/auth.middleware";

export async function authRoutes(fastify: FastifyInstance) {
  const controller = new AuthController();

  fastify.post(
    "/signup",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "15 minutes",
          errorResponseBuilder: () => ({
            success: false,
            error: {
              code: "TOO_MANY_REQUESTS",
              message: "Too many sign-up attempts. Please try again after 15 minutes.",
            },
          }),
        },
      },
    },
    controller.signup
  );

  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "15 minutes",
          errorResponseBuilder: () => ({
            success: false,
            error: {
              code: "TOO_MANY_REQUESTS",
              message: "Too many login attempts. Please try again after 15 minutes.",
            },
          }),
        },
      },
    },
    controller.login
  );

  fastify.post("/logout", controller.logout);
  fastify.get("/me", { preHandler: [authenticate] }, controller.me);
}
