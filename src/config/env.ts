import { z } from "zod";
import "dotenv/config";
import logger from "@/lib/logger";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.string().default("info"),
});

let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error: any) {
  logger.error("❌ Invalid environment variables during startup:");
  if (error instanceof z.ZodError) {
    error.issues.forEach((issue) => {
      logger.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
  } else {
    logger.error(error);
  }
  process.exit(1);
}

// In production, enforce that JWT_SECRET is not the default fallback or trivial
if (parsedEnv.NODE_ENV === "production") {
  if (parsedEnv.JWT_SECRET === "super-secret-key-change-in-production") {
    logger.error("❌ SECURITY ERROR: Default JWT_SECRET cannot be used in production environment!");
    process.exit(1);
  }
}

export const env = parsedEnv;
export default env;
