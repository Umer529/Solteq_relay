import { z } from "zod";

export const projectIdSchema = z.string().uuid();

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).nullable().optional(),
});

export const updateProjectSchema = createProjectSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);
