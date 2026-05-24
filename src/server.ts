import "dotenv/config";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import env from "./config/env";
import logger from "./lib/logger";
import { authRoutes } from "./routes/auth.routes";
import { whatsappRoutes } from "./routes/whatsapp.routes";
import { automationRoutes } from "./routes/automation.routes";
import { dashboardRoutes } from "./routes/dashboard.routes";
import whatsappManager from "./modules/whatsapp/manager";
import { startMessageWorker } from "./workers/message.worker";

const server = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  },
});

// Register CORS
server.register(fastifyCors, {
  origin: [env.FRONTEND_URL],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

// Register Cookie
server.register(fastifyCookie, {
  secret: env.JWT_SECRET,
});

// Register JWT
server.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: "token",
    signed: false,
  },
});

// Register Rate Limiting
server.register(rateLimit, {
  global: true,
  max: 150, // High standard default limit per IP
  timeWindow: "1 minute",
  errorResponseBuilder: (request, context) => ({
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Please try again after ${context.after}.`,
    },
  }),
});

// Register Routes
server.register(authRoutes, { prefix: "/api/auth" });
server.register(whatsappRoutes, { prefix: "/api/whatsapp" });
server.register(automationRoutes, { prefix: "/api/automations" });
server.register(dashboardRoutes, { prefix: "/api/dashboard" });

async function start() {
  try {
    await server.listen({ port: env.PORT, host: env.HOST });
    logger.info(`Server running on ${env.HOST}:${env.PORT}`);
    
    // Start BullMQ worker
    startMessageWorker();

    // Restore all authenticated WhatsApp sessions on startup
    await whatsappManager.restoreAllSessions().catch((err) => {
      logger.error(err, "Failed to restore WhatsApp sessions on startup");
    });
  } catch (err) {
    logger.error(err, "Failed to start server");
    process.exit(1);
  }
}

start();

export default server;

