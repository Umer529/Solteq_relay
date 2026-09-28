import cors from "cors";
import express from "express";
import helmet from "helmet";
import { getConfig } from "./config.js";
import { errorHandler, notFoundHandler } from "./lib/errors.js";
import { healthRouter } from "./routes/health.js";
import { projectsRouter } from "./routes/projects.js";
import { tasksRouter } from "./routes/tasks.js";
import { messagesRouter } from "./routes/messages.js";

export function createApp() {
  const config = getConfig();
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: config.WEB_ORIGIN,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Authorization", "Content-Type"],
    }),
  );
  app.use(express.json({ limit: "32kb" }));

  app.use("/health", healthRouter);
  app.use("/projects", messagesRouter);
  app.use("/projects", tasksRouter);
  app.use("/projects", projectsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
