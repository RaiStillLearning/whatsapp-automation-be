import { Worker, Job } from "bullmq";
import redis from "@/lib/redis";
import logger from "@/lib/logger";
import { MessageJobData } from "@/queues/message.queue";
import { MessageLogRepository } from "@/modules/message/repository";
import { AutomationRepository } from "@/modules/automation/repository";
import { ActivityLogRepository } from "@/modules/activity/repository";
import whatsappManager from "@/modules/whatsapp/manager";

const messageRepo = new MessageLogRepository();
const automationRepo = new AutomationRepository();
const activityRepo = new ActivityLogRepository();

async function processMessage(job: Job<MessageJobData>): Promise<void> {
  const { userId, contactNumber, contactName, messageBody, waMessageId } = job.data;

  logger.info({ userId, contactNumber, waMessageId }, "Processing incoming message");

  // Idempotency check — prevent duplicate processing
  const isDuplicate = await messageRepo.existsByWaMessageId(waMessageId);
  if (isDuplicate) {
    logger.info({ waMessageId }, "Duplicate message detected, skipping");
    return;
  }

  // 1. Store incoming message
  await messageRepo.create({
    wa_message_id: waMessageId,
    user_id: userId,
    contact_name: contactName,
    contact_number: contactNumber,
    message_body: messageBody,
    direction: "incoming",
    is_automated: false,
  });

  // 2. Log activity for incoming message
  await activityRepo.create(userId, "message_received", {
    contact: contactName || contactNumber,
    body: messageBody.substring(0, 100), // Truncate for metadata
  });

  // Loop & Spam Protection Check: 1 reply max per contact per 30s
  const cooldownKey = `whatsapp:cooldown:${userId}:${contactNumber}`;
  const isCooledDown = await redis.get(cooldownKey);
  if (isCooledDown) {
    logger.info({ userId, contactNumber }, "Automated reply skipped due to 30-second loop protection cooldown");
    return;
  }

  // 3. Fetch user's active automation rules
  const rules = await automationRepo.getActiveByUserId(userId);

  if (rules.length === 0) {
    logger.debug({ userId }, "No active automation rules, skipping match");
    return;
  }

  // 4. Match keywords against message body (case-insensitive, substring)
  const lowerBody = messageBody.toLowerCase();
  const matchedRule = rules.find((rule: any) =>
    lowerBody.includes(rule.keyword.toLowerCase())
  );

  if (!matchedRule) {
    logger.debug({ userId, messageBody: messageBody.substring(0, 50) }, "No rule matched");
    return;
  }

  logger.info({ userId, keyword: matchedRule.keyword }, "Automation rule matched");

  // 5. Send automated reply via WhatsApp
  const client = whatsappManager.getClient(userId);
  if (!client) {
    logger.warn({ userId }, "No WhatsApp client available to send reply");
    return;
  }

  try {
    const chatId = contactNumber.includes("@")
      ? contactNumber
      : `${contactNumber}@c.us`;

    // Simulate natural human typing behavior to prevent WhatsApp auto-bans
    try {
      const chat = await client.getChatById(chatId);
      await chat.sendStateTyping();

      // Calculate dynamic typing delay: ~35ms per character + 1 to 2.5 seconds thinking time
      const baseDelay = matchedRule.reply.length * 35;
      const randomDelay = Math.floor(Math.random() * 1500) + 1000;
      const totalDelay = Math.max(2000, Math.min(6000, baseDelay + randomDelay));

      logger.info({ userId, chatId, delayMs: totalDelay }, "Simulating typing state before automated reply");
      await new Promise((resolve) => setTimeout(resolve, totalDelay));
      
      // Stop typing state immediately before sending message
      await chat.clearState().catch(() => {});
    } catch (chatError) {
      logger.warn({ userId, chatId, chatError }, "Failed to simulate typing state, falling back to safe delay");
      // Fallback: simple safe default delay of 2.5 seconds
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    const sentMessage = await client.sendMessage(chatId, matchedRule.reply);

    // Set 30-second cooldown in Redis for this customer to prevent bot reply loops
    await redis.set(cooldownKey, "1", "EX", 30);

    // 6. Store outgoing automated message
    await messageRepo.create({
      wa_message_id: sentMessage.id._serialized, // True WhatsApp unique ID
      user_id: userId,
      contact_name: contactName,
      contact_number: contactNumber,
      message_body: matchedRule.reply,
      direction: "outgoing",
      is_automated: true,
      rule_id: matchedRule.id,
    });

    // 7. Log activity for reply sent
    await activityRepo.create(userId, "reply_sent", {
      contact: contactName || contactNumber,
      keyword: matchedRule.keyword,
      reply: matchedRule.reply.substring(0, 100),
    });

    logger.info(
      { userId, contactNumber, keyword: matchedRule.keyword },
      "Automated reply sent successfully"
    );
  } catch (error) {
    logger.error(
      { userId, contactNumber, error },
      "Failed to send automated reply"
    );
    throw error; // Will be retried by BullMQ
  }
}

// Create the worker
let messageWorker: Worker<MessageJobData> | null = null;

export function startMessageWorker(): Worker<MessageJobData> {
  if (messageWorker) {
    logger.warn("Message worker already running");
    return messageWorker;
  }

  messageWorker = new Worker<MessageJobData>(
    "message-processing",
    processMessage,
    {
      connection: redis,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000, // Max 10 jobs per second
      },
    }
  );

  messageWorker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Message job completed");
  });

  messageWorker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      "Message job failed"
    );
  });

  messageWorker.on("error", (error) => {
    logger.error({ error: error.message }, "Message worker error");
  });

  logger.info("Message processing worker started");
  return messageWorker;
}

export function getMessageWorker(): Worker<MessageJobData> | null {
  return messageWorker;
}
