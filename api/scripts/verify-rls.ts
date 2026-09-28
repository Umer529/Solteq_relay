import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const env = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_ANON_KEY: z.string().min(1),
  })
  .parse(process.env);

const projectId = "10000000-0000-4000-8000-000000000001";
const password = "Temporary-RLS-Password123!";
const email = `rls-check-${Date.now()}@relay.demo`;

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifyRls(): Promise<void> {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "RLS Check" },
  });
  if (createError) throw createError;

  try {
    const outsider = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await outsider.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    const [projectsResult, tasksResult, membershipsResult, messagesResult, activityResult] = await Promise.all([
      outsider.from("projects").select("id").eq("id", projectId),
      outsider.from("tasks").select("id").eq("project_id", projectId),
      outsider.from("memberships").select("user_id").eq("project_id", projectId),
      outsider.from("messages").select("id").eq("project_id", projectId),
      outsider.from("activity_log").select("id").eq("project_id", projectId),
    ]);

    for (const result of [
      projectsResult,
      tasksResult,
      membershipsResult,
      messagesResult,
      activityResult,
    ]) {
      if (result.error) throw result.error;
      if (result.data.length !== 0) {
        throw new Error("RLS failure: a non-member received protected project rows.");
      }
    }

    const { error: writeError } = await outsider.from("tasks").insert({
      project_id: projectId,
      title: "This direct browser write must fail",
      created_by: created.user.id,
    });
    if (!writeError) {
      throw new Error("RLS failure: a direct authenticated table write succeeded.");
    }

    console.log("RLS verified: non-member reads returned zero rows and direct writes were denied.");
  } finally {
    const { error: deleteError } = await admin.auth.admin.deleteUser(created.user.id);
    if (deleteError) console.error("Could not remove temporary RLS user:", deleteError.message);
  }
}

verifyRls().catch((error: unknown) => {
  console.error("RLS verification failed:", error);
  process.exitCode = 1;
});
