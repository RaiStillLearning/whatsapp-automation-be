import Fastify from "fastify";
import logger from "./lib/logger";

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

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

async function start() {
  try {
    await server.listen({ port: PORT, host: HOST });
    logger.info(`Server running on ${HOST}:${PORT}`);
  } catch (err) {
    logger.error(err, "Failed to start server");
    process.exit(1);
  }
}

start();

export default server;
