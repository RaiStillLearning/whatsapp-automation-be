import "dotenv/config";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import logger from "./lib/logger";
import { authRoutes } from "./routes/auth.routes";
import { whatsappRoutes } from "./routes/whatsapp.routes";
import { automationRoutes } from "./routes/automation.routes";
import { dashboardRoutes } from "./routes/dashboard.routes";
import whatsappManager from "./modules/whatsapp/manager";
import { startMessageWorker } from "./workers/message.worker";

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
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
  origin: ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

// Register Cookie
server.register(fastifyCookie, {
  secret: process.env.JWT_SECRET || "super-secret-key-change-in-production",
});

// Register JWT
server.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "super-secret-key-change-in-production",
  cookie: {
    cookieName: "token",
    signed: false,
  },
});

// Register Routes
server.register(authRoutes, { prefix: "/api/auth" });
server.register(whatsappRoutes, { prefix: "/api/whatsapp" });
server.register(automationRoutes, { prefix: "/api/automations" });
server.register(dashboardRoutes, { prefix: "/api/dashboard" });

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

async function start() {
  try {
    await server.listen({ port: PORT, host: HOST });
    logger.info(`Server running on ${HOST}:${PORT}`);
    
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
