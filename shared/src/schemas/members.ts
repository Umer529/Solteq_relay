import { z } from "zod";
import { emailSchema } from "./auth.js";

export const projectRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: projectRoleSchema,
});

export const changeMemberRoleSchema = z.object({
  role: projectRoleSchema,
});

export const userIdSchema = z.string().uuid();
