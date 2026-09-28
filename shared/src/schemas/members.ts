import { z } from "zod";
import { emailSchema } from "./auth.js";

export const projectRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: projectRoleSchema,
  password: z.string().min(6, "Password must be at least 6 characters").max(100).optional().or(z.literal("")),
  displayName: z.string().max(60).optional().or(z.literal("")),
});

export const changeMemberRoleSchema = z.object({
  role: projectRoleSchema,
});

export const userIdSchema = z.string().uuid();
