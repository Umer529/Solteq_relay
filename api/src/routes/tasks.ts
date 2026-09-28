import { Router } from "express";
import {
  can,
  changeTaskStatusSchema,
  createTaskSchema,
  projectIdSchema,
  taskIdSchema,
  updateTaskSchema,
} from "@relay/shared";
import { AppError } from "../lib/errors.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireMember } from "../middleware/require-member.js";
import {
  changeTaskStatus,
  createTask,
  deleteTask,
  getProjectSnapshot,
  getTask,
  updateTask,
} from "../services/tasks.js";

export const tasksRouter = Router();

function actor(request: Express.Request) {
  if (!request.user) throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  return request.user;
}

function membership(request: Express.Request) {
  if (!request.membership) throw new AppError(403, "FORBIDDEN", "Project membership is required.");
  return request.membership;
}

tasksRouter.use(authenticate);

tasksRouter.get("/:id/snapshot", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const user = actor(request);
  const member = membership(request);
  if (!can(member.role, "project.view", { actorId: user.id })) {
    throw new AppError(403, "FORBIDDEN", "You cannot view this project.");
  }

  response.json({ data: await getProjectSnapshot(projectId) });
});

tasksRouter.post("/:id/tasks", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const input = createTaskSchema.parse(request.body);
  const user = actor(request);
  const member = membership(request);
  if (!can(member.role, "task.create", { actorId: user.id })) {
    throw new AppError(403, "FORBIDDEN", "Viewers cannot create requirements.");
  }

  response.status(201).json({ data: await createTask(projectId, input, user.id) });
});

tasksRouter.patch("/:id/tasks/:taskId", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const taskId = taskIdSchema.parse(request.params.taskId);
  const input = updateTaskSchema.parse(request.body);
  const user = actor(request);
  const member = membership(request);
  const task = await getTask(projectId, taskId);
  if (
    !can(member.role, "task.edit", {
      actorId: user.id,
      task: { createdBy: task.createdBy, assigneeId: task.assigneeId },
    })
  ) {
    throw new AppError(403, "FORBIDDEN", "You can only edit requirements you created or own.");
  }

  response.json({ data: await updateTask(task, input, user.id) });
});

tasksRouter.patch("/:id/tasks/:taskId/status", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const taskId = taskIdSchema.parse(request.params.taskId);
  const input = changeTaskStatusSchema.parse(request.body);
  const user = actor(request);
  const member = membership(request);
  await getTask(projectId, taskId);
  if (!can(member.role, "task.changeStatus", { actorId: user.id })) {
    throw new AppError(403, "FORBIDDEN", "Viewers cannot move requirements.");
  }

  response.json({
    data: await changeTaskStatus(taskId, input.status, input.position, user.id),
  });
});

tasksRouter.delete("/:id/tasks/:taskId", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const taskId = taskIdSchema.parse(request.params.taskId);
  const user = actor(request);
  const member = membership(request);
  const task = await getTask(projectId, taskId);
  if (
    !can(member.role, "task.delete", {
      actorId: user.id,
      task: { createdBy: task.createdBy, assigneeId: task.assigneeId },
    })
  ) {
    throw new AppError(403, "FORBIDDEN", "You can only delete requirements you created.");
  }

  await deleteTask(taskId, user.id);
  response.status(204).send();
});
