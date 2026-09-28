import { Router } from "express";
import rateLimit from "express-rate-limit";
import { can, editMessageSchema, messageIdSchema, messagePaginationSchema, postMessageSchema, projectIdSchema } from "@relay/shared";
import { AppError } from "../lib/errors.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireMember } from "../middleware/require-member.js";
import { deleteMessage, getMessage, getMessages, postMessage, updateMessage } from "../services/messages.js";

export const messagesRouter = Router();

const messageRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many messages. Try again shortly." } },
});

function actor(request: Express.Request) {
  if (!request.user) throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  return request.user;
}

function membership(request: Express.Request) {
  if (!request.membership) throw new AppError(403, "FORBIDDEN", "Project membership is required.");
  return request.membership;
}

messagesRouter.use(authenticate);

messagesRouter.get("/:id/messages", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const query = messagePaginationSchema.parse(request.query);
  const user = actor(request);
  const member = membership(request);
  if (!can(member.role, "project.view", { actorId: user.id })) {
    throw new AppError(403, "FORBIDDEN", "You cannot view this project chat.");
  }

  response.json({ data: await getMessages(projectId, query.before, query.limit) });
});

messagesRouter.post("/:id/messages", messageRateLimit, requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const input = postMessageSchema.parse(request.body);
  const user = actor(request);
  const member = membership(request);
  if (!can(member.role, "message.post", { actorId: user.id })) {
    throw new AppError(403, "FORBIDDEN", "Viewers cannot post messages.");
  }

  response.status(201).json({ data: await postMessage(projectId, input.body, user.id) });
});

messagesRouter.patch("/:id/messages/:messageId", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const messageId = messageIdSchema.parse(request.params.messageId);
  const input = editMessageSchema.parse(request.body);
  const user = actor(request);
  const member = membership(request);
  const current = await getMessage(projectId, messageId);
  if (!can(member.role, "message.edit", { actorId: user.id, message: { userId: current.userId } })) {
    throw new AppError(403, "FORBIDDEN", "Only the message author can edit it.");
  }
  response.json({ data: await updateMessage(messageId, input.body, user.id) });
});

messagesRouter.delete("/:id/messages/:messageId", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const messageId = messageIdSchema.parse(request.params.messageId);
  const user = actor(request);
  const member = membership(request);
  const current = await getMessage(projectId, messageId);
  if (!can(member.role, "message.delete", { actorId: user.id, message: { userId: current.userId } })) {
    throw new AppError(403, "FORBIDDEN", "You cannot delete this message.");
  }
  await deleteMessage(messageId, user.id);
  response.status(204).send();
});
