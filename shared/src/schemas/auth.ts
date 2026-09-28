import { z } from "zod";

export const emailSchema = z.string().trim().email().max(254);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const registerSchema = loginSchema.extend({
  displayName: z.string().trim().min(2).max(60),
});
