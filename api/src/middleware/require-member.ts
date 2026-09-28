import type { NextFunction, Request, Response } from "express";
import type { ProjectRole } from "@relay/shared";
import { AppError } from "../lib/errors.js";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";

declare global {
  namespace Express {
    interface Request {
      membership?: { projectId: string; role: ProjectRole };
    }
  }
}

export async function requireMember(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = request.params.id;
    if (typeof projectId !== "string" || !request.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const { data, error } = await getSupabaseAdmin()
      .from("memberships")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", request.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new AppError(403, "FORBIDDEN", "You are not a member of this project.");

    request.membership = { projectId, role: data.role as ProjectRole };
    next();
  } catch (error) {
    next(error);
  }
}
