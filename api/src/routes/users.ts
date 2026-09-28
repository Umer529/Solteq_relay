import { Router, type NextFunction, type Request, type Response } from "express";
import { createUserSchema, type ProjectRole } from "@relay/shared";
import { authenticate } from "../middleware/authenticate.js";
import { AppError } from "../lib/errors.js";
import { throwDatabaseError } from "../lib/database-error.js";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";
import { addMember, createUserAndProfile, findProfileByEmail } from "../services/projects.js";

export const usersRouter = Router();

usersRouter.use(authenticate);

async function requireAdminOrOwner(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  if (!request.user) throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("memberships")
    .select("project_id,role")
    .eq("user_id", request.user.id)
    .in("role", ["owner", "admin"]);
  if (error) throwDatabaseError(error);
  if (!data || data.length === 0) {
    throw new AppError(403, "FORBIDDEN", "Only project owners and admins can access user management.");
  }
  next();
}

usersRouter.use(requireAdminOrOwner);

usersRouter.get("/", async (_request, response) => {
  const admin = getSupabaseAdmin();
  const { data: profiles, error: pError } = await admin
    .from("profiles")
    .select("id,email,display_name,avatar_color,created_at")
    .order("created_at", { ascending: false });
  if (pError) throwDatabaseError(pError);

  const { data: memberships, error: mError } = await admin
    .from("memberships")
    .select("user_id,role,project_id,projects(id,name)");
  if (mError) throwDatabaseError(mError);

  interface MembershipRow {
    user_id: string;
    role: ProjectRole;
    project_id: string;
    projects: { id: string; name: string } | null;
  }

  const membershipMap = new Map<string, { projectId: string; projectName: string; role: ProjectRole }[]>();
  for (const row of (memberships ?? []) as unknown as MembershipRow[]) {
    if (!row.projects) continue;
    const list = membershipMap.get(row.user_id) ?? [];
    list.push({
      projectId: row.projects.id,
      projectName: row.projects.name,
      role: row.role,
    });
    membershipMap.set(row.user_id, list);
  }

  const result = (profiles ?? []).map((profile) => ({
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    avatarColor: profile.avatar_color,
    createdAt: profile.created_at,
    memberships: membershipMap.get(profile.id) ?? [],
  }));

  response.json({ data: result });
});

usersRouter.post("/", async (request, response) => {
  const input = createUserSchema.parse(request.body);
  const caller = request.user!;

  const existing = await findProfileByEmail(input.email).catch(() => null);
  if (existing) {
    throw new AppError(409, "CONFLICT", "A user with this email address already exists.");
  }

  const createdProfile = await createUserAndProfile(input.email, input.password, input.displayName);

  if (input.projectId) {
    const admin = getSupabaseAdmin();
    const { data: callerMembership, error } = await admin
      .from("memberships")
      .select("role")
      .eq("project_id", input.projectId)
      .eq("user_id", caller.id)
      .in("role", ["owner", "admin"])
      .maybeSingle();
    if (error) throwDatabaseError(error);
    if (!callerMembership) {
      throw new AppError(403, "FORBIDDEN", "You can only assign members to projects you own or administer.");
    }

    await addMember(input.projectId, createdProfile.id, input.role ?? "member", caller.id);
  }

  response.status(201).json({ data: createdProfile });
});
