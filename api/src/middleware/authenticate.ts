import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedUser } from "../lib/jwt.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { AppError } from "../lib/errors.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [scheme, token] = request.header("authorization")?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) {
      throw new AppError(401, "UNAUTHORIZED", "A bearer access token is required.");
    }

    request.user = await verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
