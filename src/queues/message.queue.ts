import { Queue } from "bullmq";
import redis from "@/lib/redis";

export interface MessageJobData {
  userId: string;
  contactNumber: string;
  contactName: string | null;
  messageBody: string;
  waMessageId: string;
}

export const messageQueue = new Queue<MessageJobData>("message-processing", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 60 * 60, // 24 hours
    },
    removeOnFail: {
      count: 500,
    },
  },
});
