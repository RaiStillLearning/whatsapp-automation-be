import { Client, LocalAuth } from "whatsapp-web.js";
import logger from "@/lib/logger";
import { WhatsappRepository } from "./repository";
import { registerClientEvents } from "./client-events";

export type ClientStatus =
  | "idle"
  | "initializing"
  | "qr_pending"
  | "authenticated"
  | "disconnected"
  | "failed";

export type QRSubscriber = (data: {
  event: "qr" | "ready" | "auth_failure" | "disconnected" | "status";
  payload: string;
}) => void;

export class WhatsappManager {
  // Client registry — one client per user, strictly
  private clients: Map<string, Client> = new Map();

  // Per-user mutex — serializes all lifecycle ops for a given userId
  // Prevents: rapid clicks, init-during-destroy, double-init
  private locks: Map<string, Promise<void>> = new Map();

  // Track client status separately (client object may not reflect current lifecycle stage)
  private statuses: Map<string, ClientStatus> = new Map();

  // SSE subscribers — for pushing QR updates to frontend
  private qrSubscribers: Map<string, Set<QRSubscriber>> = new Map();

  private repository = new WhatsappRepository();

  /**
   * Promise-chain per-user mutex.
   * All lifecycle operations (init, destroy) for the same user are serialized.
   */
  private async withLock(userId: string, fn: () => Promise<void>): Promise<void> {
    const existing = this.locks.get(userId) ?? Promise.resolve();
    const next = existing.then(fn, fn); // run even if previous failed
    this.locks.set(userId, next);
    try {
      await next;
    } finally {
      // Clean up lock reference if this was the last operation
      if (this.locks.get(userId) === next) {
        this.locks.delete(userId);
      }
    }
  }

  /**
   * Initialize a WhatsApp client for a user.
   * Acquires per-user lock to prevent race conditions.
   */
  async initializeClient(userId: string): Promise<void> {
    return this.withLock(userId, async () => {
      const currentStatus = this.statuses.get(userId);

      // Guard: already authenticated → no-op
      if (currentStatus === "authenticated") {
        logger.info({ userId }, "Client already authenticated, skipping init");
        return;
      }

      // Guard: already initializing or pending QR → no-op
      if (currentStatus === "initializing" || currentStatus === "qr_pending") {
        logger.info({ userId }, "Client already initializing, skipping duplicate init");
        return;
      }

      // Cleanup: if client exists in any other state → destroy it first
      if (this.clients.has(userId)) {
        logger.info({ userId }, "Cleaning up existing client before re-init");
        await this.forceDestroyClient(userId);
      }

      this.statuses.set(userId, "initializing");
      await this.repository.updateStatus(userId, "initializing");

      try {
        const client = new Client({
          authStrategy: new LocalAuth({ clientId: userId }),
          puppeteer: {
            headless: true,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-accelerated-2d-canvas",
              "--no-first-run",
              "--disable-gpu",
            ],
          },
        });

        // Register event handlers BEFORE initialize
        registerClientEvents(client, userId, this);

        // Store in map immediately so destroy can find it
        this.clients.set(userId, client);

        await client.initialize();
      } catch (error) {
        logger.error({ userId, error }, "Failed to initialize WhatsApp client");
        // Always clean up on failure
        await this.forceDestroyClient(userId);
        this.statuses.set(userId, "failed");
        await this.repository.updateStatus(userId, "failed");
        this.notifySubscribers(userId, { event: "auth_failure", payload: "Initialization failed" });
        throw error;
      }
    });
  }

  /**
   * Gracefully destroy a WhatsApp client.
   * Acquires per-user lock.
   */
  async destroyClient(userId: string): Promise<void> {
    return this.withLock(userId, async () => {
      await this.forceDestroyClient(userId);
      this.statuses.set(userId, "disconnected");
      await this.repository.updateStatus(userId, "disconnected");
      this.notifySubscribers(userId, { event: "disconnected", payload: "Session disconnected" });
      logger.info({ userId }, "Client destroyed and disconnected");
    });
  }

  /**
   * Force destroy without lock — used internally within already-locked contexts.
   */
  private async forceDestroyClient(userId: string): Promise<void> {
    const client = this.clients.get(userId);
    if (!client) return;

    try {
      // Timeout protection: don't wait forever for destroy
      await Promise.race([
        client.destroy(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Client destroy timeout")), 5000)
        ),
      ]);
    } catch (error) {
      logger.warn({ userId, error }, "Error during client destroy, forcing cleanup");
    } finally {
      // ALWAYS remove from map, even if destroy failed
      this.clients.delete(userId);
    }
  }

  /**
   * Get a client instance (read-only, no lock needed).
   */
  getClient(userId: string): Client | undefined {
    return this.clients.get(userId);
  }

  /**
   * Get current client status.
   */
  getClientStatus(userId: string): ClientStatus {
    return this.statuses.get(userId) || "idle";
  }

  /**
   * Update client status (called from event handlers).
   */
  setClientStatus(userId: string, status: ClientStatus): void {
    this.statuses.set(userId, status);
  }

  /**
   * Subscribe to QR/status events for a user.
   */
  addSubscriber(userId: string, subscriber: QRSubscriber): void {
    if (!this.qrSubscribers.has(userId)) {
      this.qrSubscribers.set(userId, new Set());
    }
    this.qrSubscribers.get(userId)!.add(subscriber);
  }

  /**
   * Remove a subscriber.
   */
  removeSubscriber(userId: string, subscriber: QRSubscriber): void {
    const subs = this.qrSubscribers.get(userId);
    if (subs) {
      subs.delete(subscriber);
      if (subs.size === 0) {
        this.qrSubscribers.delete(userId);
      }
    }
  }

  /**
   * Notify all subscribers for a user.
   */
  notifySubscribers(userId: string, data: { event: string; payload: string }): void {
    const subs = this.qrSubscribers.get(userId);
    if (subs) {
      for (const sub of subs) {
        try {
          sub(data as any);
        } catch (error) {
          logger.error({ userId, error }, "Error in QR subscriber callback");
        }
      }
    }
  }

  /**
   * Clear all subscribers for a user.
   */
  clearSubscribers(userId: string): void {
    this.qrSubscribers.delete(userId);
  }

  /**
   * Restore all previously-authenticated sessions on server startup.
   * Sequential to avoid Chromium resource exhaustion.
   */
  async restoreAllSessions(): Promise<void> {
    logger.info("Restoring all authenticated WhatsApp sessions...");
    const sessions = await this.repository.getAllAuthenticatedSessions();

    for (const session of sessions) {
      try {
        logger.info({ userId: session.user_id }, "Restoring session");
        await this.initializeClient(session.user_id);
      } catch (error) {
        logger.error({ userId: session.user_id, error }, "Failed to restore session, marking as expired");
        await this.repository.updateStatus(session.user_id, "expired");
        this.statuses.set(session.user_id, "failed");
      }
    }

    logger.info(`Restored ${sessions.length} WhatsApp session(s)`);
  }

  /**
   * Graceful shutdown — destroy all active clients.
   * Called on SIGTERM/SIGINT.
   */
  async destroyAll(): Promise<void> {
    logger.info("Shutting down all WhatsApp clients...");
    const userIds = Array.from(this.clients.keys());

    for (const userId of userIds) {
      try {
        await this.forceDestroyClient(userId);
        logger.info({ userId }, "Client destroyed on shutdown");
      } catch (error) {
        logger.error({ userId, error }, "Error destroying client on shutdown");
      }
    }

    this.clients.clear();
    this.statuses.clear();
    this.qrSubscribers.clear();
    this.locks.clear();
    logger.info("All WhatsApp clients shut down");
  }
}

// Singleton instance
const whatsappManager = new WhatsappManager();

// Graceful shutdown handlers
process.on("SIGTERM", async () => {
  await whatsappManager.destroyAll();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await whatsappManager.destroyAll();
  process.exit(0);
});

export default whatsappManager;
