import { AppError } from "./errors.js";

export function throwDatabaseError(error: { code?: string; message: string }): never {
  if (error.code === "23505") throw new AppError(409, "CONFLICT", "That record already exists.");
  if (error.code === "23514") throw new AppError(409, "CONFLICT", error.message);
  if (error.code === "P0002") throw new AppError(404, "NOT_FOUND", error.message);
  if (error.code === "42501") throw new AppError(403, "FORBIDDEN", error.message);
  throw error;
}
