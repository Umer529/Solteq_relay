import { z } from "zod";

export const postMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const messagePaginationSchema = z.object({
  before: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});
