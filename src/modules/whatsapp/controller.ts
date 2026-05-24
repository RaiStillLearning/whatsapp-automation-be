import { FastifyReply, FastifyRequest } from "fastify";
import whatsappManager from "./manager";
import { WhatsappRepository } from "./repository";
import logger from "@/lib/logger";

const repository = new WhatsappRepository();

export class WhatsappController {
  /**
   * POST /api/whatsapp/connect
   * Starts the WhatsApp client initialization process.
   */
  connect = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string } | undefined;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    const currentStatus = whatsappManager.getClientStatus(user.id);

    // Guard: already authenticated
    if (currentStatus === "authenticated") {
      return reply.send({
        success: true,
        data: { status: "authenticated", message: "Already connected" },
      });
    }

    // Guard: already initializing
    if (currentStatus === "initializing" || currentStatus === "qr_pending") {
      return reply.send({
        success: true,
        data: { status: currentStatus, message: "Connection already in progress" },
      });
    }

    try {
      // Fire and forget — client events will push updates via SSE
      whatsappManager.initializeClient(user.id).catch((error) => {
        logger.error({ userId: user.id, error }, "Background client initialization failed");
      });

      return reply.send({
        success: true,
        data: { status: "initializing", message: "WhatsApp connection started" },
      });
    } catch (error: any) {
      logger.error({ userId: user.id, error }, "Failed to start WhatsApp connection");
      return reply.status(500).send({
        success: false,
        error: { code: "CONNECTION_FAILED", message: error.message || "Failed to connect" },
      });
    }
  };

  /**
   * POST /api/whatsapp/disconnect
   * Destroys the WhatsApp session.
   */
  disconnect = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string } | undefined;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    try {
      await whatsappManager.destroyClient(user.id);
      return reply.send({
        success: true,
        data: { status: "disconnected", message: "WhatsApp disconnected" },
      });
    } catch (error: any) {
      logger.error({ userId: user.id, error }, "Failed to disconnect WhatsApp");
      return reply.status(500).send({
        success: false,
        error: { code: "DISCONNECT_FAILED", message: error.message || "Failed to disconnect" },
      });
    }
  };

  /**
   * GET /api/whatsapp/status
   * Returns current session status and phone number.
   */
  status = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string } | undefined;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    const session = await repository.getSession(user.id);
    const liveStatus = whatsappManager.getClientStatus(user.id);

    return reply.send({
      success: true,
      data: {
        status: liveStatus !== "idle" ? liveStatus : session?.status || "disconnected",
        phone: session?.phone || null,
      },
    });
  };

  /**
   * GET /api/whatsapp/qr
   * SSE endpoint that streams QR code updates and status changes in real time.
   */
  qrStream = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string } | undefined;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    // Set SSE headers — must include CORS manually because reply.raw.writeHead()
    // bypasses Fastify's plugin pipeline (including @fastify/cors)
    const origin = request.headers.origin;
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
      "Access-Control-Allow-Origin": origin || "http://localhost:3000",
      "Access-Control-Allow-Credentials": "true",
    });

    // Send initial status
    const currentStatus = whatsappManager.getClientStatus(user.id);
    reply.raw.write(
      `data: ${JSON.stringify({ event: "status", payload: currentStatus })}\n\n`
    );

    // Subscribe to updates
    const subscriber = (data: { event: string; payload: string }) => {
      try {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        // Client disconnected, will be cleaned up
      }
    };

    whatsappManager.addSubscriber(user.id, subscriber);

    // Cleanup on client disconnect
    request.raw.on("close", () => {
      whatsappManager.removeSubscriber(user.id, subscriber);
      logger.debug({ userId: user.id }, "SSE client disconnected");
    });

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(": heartbeat\n\n");
      } catch {
        clearInterval(heartbeat);
      }
    }, 30000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
    });
  };
}
