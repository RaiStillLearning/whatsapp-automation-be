import { z } from "zod";

export const createAutomationSchema = z.object({
  keyword: z
    .string()
    .min(1, "Keyword is required")
    .max(100, "Keyword must be 100 characters or less")
    .trim(),
  reply: z
    .string()
    .min(1, "Reply is required")
    .max(1000, "Reply must be 1000 characters or less")
    .trim(),
});

export const updateAutomationSchema = z.object({
  keyword: z
    .string()
    .min(1, "Keyword is required")
    .max(100, "Keyword must be 100 characters or less")
    .trim()
    .optional(),
  reply: z
    .string()
    .min(1, "Reply is required")
    .max(1000, "Reply must be 1000 characters or less")
    .trim()
    .optional(),
  is_active: z.boolean().optional(),
});

export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
