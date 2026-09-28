import { z } from "zod";
import { emailSchema } from "./auth.js";
import { projectRoles } from "../permissions.js";

export const projectRoleSchema = z.enum(projectRoles);

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: projectRoleSchema,
  password: z.string().min(6, "Password must be at least 6 characters").max(100).optional().or(z.literal("")),
  displayName: z.string().max(60).optional().or(z.literal("")),
});

export const changeMemberRoleSchema = z.object({
  role: projectRoleSchema,
});

export const createUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  displayName: z.string().min(1, "Display name is required").max(60),
  projectId: z.string().uuid().optional().or(z.literal("")),
  role: projectRoleSchema.optional(),
});

export const userIdSchema = z.string().uuid();
