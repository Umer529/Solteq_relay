import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const taskIdSchema = z.string().uuid();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  priority: taskPrioritySchema.default("medium"),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((val) => val >= new Date().toISOString().slice(0, 10), {
      message: "Due date cannot be in the past",
    })
    .nullable()
    .optional(),
  position: z.number().finite().default(0),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    priority: taskPrioritySchema.optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const changeTaskStatusSchema = z.object({
  status: taskStatusSchema,
  position: z.number().finite(),
});
