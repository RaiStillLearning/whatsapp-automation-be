import { Client } from "whatsapp-web.js";
import logger from "@/lib/logger";
import { WhatsappRepository } from "./repository";
import { ActivityLogRepository } from "../activity/repository";
import { messageQueue } from "@/queues/message.queue";
import { WhatsappManager } from "./manager";

const repository = new WhatsappRepository();
const activityRepo = new ActivityLogRepository();

/**
 * Register all event handlers for a WhatsApp client instance.
 * These handlers manage state transitions and push SSE updates.
 */
export function registerClientEvents(
  client: Client,
  userId: string,
  manager: WhatsappManager
): void {
  // QR Code received — push to SSE subscribers
  client.on("qr", async (qr: string) => {
    logger.info({ userId }, "QR code received");
    manager.setClientStatus(userId, "qr_pending");
    await repository.updateStatus(userId, "qr_pending");
    manager.notifySubscribers(userId, { event: "qr", payload: qr });
  });

  // Client is ready (authenticated + connected)
  client.on("ready", async () => {
    logger.info({ userId }, "WhatsApp client ready");
    manager.setClientStatus(userId, "authenticated");
    await repository.updateStatus(userId, "authenticated");

    // Try to get the phone number
    try {
      const info = client.info;
      if (info && info.wid) {
        const phone = info.wid.user;
        await repository.updatePhone(userId, phone);
        manager.notifySubscribers(userId, {
          event: "ready",
          payload: JSON.stringify({ phone }),
        });
      } else {
        manager.notifySubscribers(userId, {
          event: "ready",
          payload: JSON.stringify({ phone: null }),
        });
      }
    } catch (error) {
      logger.warn({ userId, error }, "Could not retrieve phone info on ready");
      manager.notifySubscribers(userId, {
        event: "ready",
        payload: JSON.stringify({ phone: null }),
      });
    }

    // Log activity
    await activityRepo.create(userId, "session_connected", {
      message: "WhatsApp session connected",
    });
  });

  // Authentication successful (happens before 'ready')
  client.on("authenticated", () => {
    logger.info({ userId }, "WhatsApp client authenticated");
    // Status will be set to 'authenticated' on 'ready' event
  });

  // Authentication failure
  client.on("auth_failure", async (msg: string) => {
    logger.error({ userId, msg }, "WhatsApp authentication failed");
    manager.setClientStatus(userId, "failed");
    await repository.updateStatus(userId, "failed");
    manager.notifySubscribers(userId, {
      event: "auth_failure",
      payload: msg || "Authentication failed",
    });

    await activityRepo.create(userId, "session_disconnected", {
      message: "Authentication failed",
      reason: msg,
    });
  });

  // Client disconnected
  client.on("disconnected", async (reason: string) => {
    logger.warn({ userId, reason }, "WhatsApp client disconnected");
    manager.setClientStatus(userId, "disconnected");
    await repository.updateStatus(userId, "disconnected");
    manager.notifySubscribers(userId, {
      event: "disconnected",
      payload: reason || "Disconnected",
    });

    // Remove client from registry
    // (Don't use manager.destroyClient here to avoid lock re-entry)

    await activityRepo.create(userId, "session_disconnected", {
      message: "WhatsApp session disconnected",
      reason,
    });
  });

  // Incoming message — push to BullMQ queue
  client.on("message", async (msg) => {
    // Safety Loop Guard: Only process incoming messages, completely ignore self-dispatched ones
    if (msg.fromMe) return;
    if (msg.from === "status@broadcast") return;
    if (msg.from.endsWith("@g.us")) return;

    try {
      const contact = await msg.getContact();
      await messageQueue.add(
        "process-message",
        {
          userId,
          contactNumber: msg.from.replace("@c.us", ""),
          contactName: contact.pushname || contact.name || null,
          messageBody: msg.body,
          waMessageId: msg.id._serialized,
        },
        {
          jobId: msg.id._serialized, // Idempotency key
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        }
      );
    } catch (error) {
      logger.error({ userId, error, messageId: msg.id._serialized }, "Failed to enqueue message");
    }
  });
}
