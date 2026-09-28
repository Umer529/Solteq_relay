import "dotenv/config";
import { createClient, type User } from "@supabase/supabase-js";
import { z } from "zod";

const env = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .parse(process.env);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const password = "Password123!";
const projectId = "10000000-0000-4000-8000-000000000001";
// Keep the demo visibly current each time the idempotent seed is run.
const baseTime = new Date(Date.now() - 3 * 24 * 60 * 60_000);

const demoUsers = [
  { email: "owner@relay.demo", displayName: "Maya Chen", role: "owner", color: "#54705f" },
  { email: "admin@relay.demo", displayName: "Theo Martin", role: "admin", color: "#596b78" },
  { email: "member1@relay.demo", displayName: "Sara Malik", role: "member", color: "#765f58" },
  { email: "member2@relay.demo", displayName: "Jon Bell", role: "member", color: "#6b6859" },
  { email: "viewer@relay.demo", displayName: "Nina Patel", role: "viewer", color: "#5f6578" },
] as const;

async function existingUsers(): Promise<Map<string, User>> {
  const users = new Map<string, User>();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((user) => {
      if (user.email) users.set(user.email.toLowerCase(), user);
    });
    if (data.users.length < 1000) return users;
    page += 1;
  }
}

async function ensureUsers(): Promise<Map<string, User>> {
  const users = await existingUsers();

  for (const demoUser of demoUsers) {
    if (users.has(demoUser.email)) continue;

    const { data, error } = await supabase.auth.admin.createUser({
      email: demoUser.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: demoUser.displayName },
    });
    if (error) throw error;
    users.set(demoUser.email, data.user);
  }

  return users;
}

function iso(minutesAfterBase: number): string {
  return new Date(baseTime.getTime() + minutesAfterBase * 60_000).toISOString();
}

async function seed(): Promise<void> {
  const users = await ensureUsers();
  const userId = (email: string): string => {
    const id = users.get(email)?.id;
    if (!id) throw new Error(`Missing seeded user: ${email}`);
    return id;
  };

  const ownerId = userId("owner@relay.demo");
  const adminId = userId("admin@relay.demo");
  const memberOneId = userId("member1@relay.demo");
  const memberTwoId = userId("member2@relay.demo");
  const contributors = [ownerId, adminId, memberOneId, memberTwoId];

  const { error: profileError } = await supabase.from("profiles").upsert(
    demoUsers.map((user) => ({
      id: userId(user.email),
      email: user.email,
      display_name: user.displayName,
      avatar_color: user.color,
    })),
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const { error: projectError } = await supabase.from("projects").upsert({
    id: projectId,
    name: "Website Redesign",
    description: "Plan and deliver the public website refresh.",
    created_by: ownerId,
    created_at: iso(0),
  });
  if (projectError) throw projectError;

  const { error: membershipError } = await supabase.from("memberships").upsert(
    demoUsers.map((user, index) => ({
      project_id: projectId,
      user_id: userId(user.email),
      role: user.role,
      created_at: iso(index),
    })),
    { onConflict: "project_id,user_id" },
  );
  if (membershipError) throw membershipError;

  const taskTemplates = [
    ["Confirm information architecture", "todo", "high"],
    ["Audit existing analytics", "todo", "medium"],
    ["Write accessibility acceptance criteria", "todo", "urgent"],
    ["Prepare launch checklist", "todo", "medium"],
    ["Review legal copy", "todo", "low"],
    ["Prototype primary navigation", "in_progress", "high"],
    ["Build responsive header", "in_progress", "urgent"],
    ["Draft case study template", "in_progress", "medium"],
    ["Connect newsletter form", "in_progress", "medium"],
    ["Test content migration", "in_progress", "high"],
    ["Interview stakeholders", "done", "medium"],
    ["Map current user journeys", "done", "high"],
    ["Choose type scale", "done", "low"],
    ["Approve visual direction", "done", "high"],
    ["Set performance budget", "done", "urgent"],
  ] as const;

  const tasks = taskTemplates.map(([title, status, priority], index) => {
    const isDone = status === "done";
    return {
      id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      project_id: projectId,
      title,
      description: `Definition and delivery notes for ${title.toLowerCase()}.`,
      status,
      priority,
      assignee_id: contributors[index % contributors.length],
      created_by: contributors[(index + 1) % contributors.length],
      completed_by: isDone ? contributors[index % contributors.length] : null,
      completed_at: isDone ? iso(3_420 + (index - 10) * 210) : null,
      due_date: new Date(Date.now() + (index - 4) * 24 * 60 * 60_000).toISOString().slice(0, 10),
      position: (index % 5) * 1000,
      created_at: iso(360 + index * 42),
      updated_at: isDone ? iso(3_420 + (index - 10) * 210) : iso(2_100 + index * 35),
    };
  });

  const { error: taskError } = await supabase
    .from("tasks")
    .upsert(tasks, { onConflict: "id" });
  if (taskError) throw taskError;

  const names = new Map(demoUsers.map((user) => [userId(user.email), user.displayName]));
  const messageBodies = [
    "I linked the analytics audit to Confirm information architecture so we can validate the new paths.",
    "Prototype primary navigation is ready. The mobile menu now follows the approved hierarchy.",
    "I drafted the first pass of Write accessibility acceptance criteria, including keyboard and focus checks.",
    "Build responsive header is holding at 768px. I still want to test the long navigation labels.",
    "Prepare launch checklist now includes DNS, redirects, analytics, and rollback owners.",
    "The stakeholder interviews are summarized. The strongest theme is faster access to case studies.",
    "Map current user journeys is complete; I added the three drop-off points we should address first.",
    "For Choose type scale, the smaller body size passed contrast and readability checks on mobile.",
    "Approve visual direction is done. The team preferred the quieter green accent and denser layout.",
    "Set performance budget is complete: 180 KB initial JavaScript and a 2.5 second LCP target.",
    "Audit existing analytics found duplicate newsletter events. I will document the cleanup before launch.",
    "Draft case study template needs one real customer example before content review.",
    "Connect newsletter form is waiting on the final audience ID from marketing.",
    "I started Test content migration with the longest article and found two broken image captions.",
    "Review legal copy can begin once the updated privacy wording lands this afternoon.",
    "Can someone review the focus order in Prototype primary navigation before I merge the interaction notes?",
    "I assigned the header breakpoint follow-up to Jon because it overlaps his content migration test.",
    "The launch checklist now calls out the owner for every blocking item instead of just the team.",
    "I checked the completed tasks against the activity feed; the five Done items now match their history.",
    "Tomorrow I will pair with Sara on the accessibility criteria and newsletter error states.",
  ] as const;
  const messages = messageBodies.map((body, index) => {
    const authorId = contributors[index % contributors.length] ?? ownerId;
    return {
      id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      project_id: projectId,
      user_id: authorId,
      body,
      created_at: iso(2_520 + index * 55),
    };
  });

  const { error: messageError } = await supabase
    .from("messages")
    .upsert(messages, { onConflict: "id" });
  if (messageError) throw messageError;

  const memberActivities = demoUsers.map((target, index) => ({
    id: `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    project_id: projectId,
    actor_id: ownerId,
    type: "member.joined",
    payload: {
      actorName: names.get(ownerId),
      targetName: target.displayName,
      userId: userId(target.email),
      role: target.role,
    },
    created_at: iso(30 + index * 12),
  }));
  const taskActivities = tasks.map((task, index) => {
    const actorId = task.created_by ?? ownerId;
    return {
      id: `40000000-0000-4000-8000-${String(index + 6).padStart(12, "0")}`,
      project_id: projectId,
      actor_id: actorId,
      type: "task.created",
      payload: { actorName: names.get(actorId), taskId: task.id, title: task.title },
      created_at: task.created_at,
    };
  });
  const completedActivities = tasks.filter((task) => task.status === "done").map((task, index) => {
    const actorId = task.completed_by ?? ownerId;
    return {
      id: `40000000-0000-4000-8000-${String(index + 21).padStart(12, "0")}`,
      project_id: projectId,
      actor_id: actorId,
      type: "task.status_changed",
      payload: {
        actorName: names.get(actorId),
        taskId: task.id,
        title: task.title,
        from: "in_progress",
        to: "done",
      },
      created_at: task.completed_at,
    };
  });
  const activities = [...memberActivities, ...taskActivities, ...completedActivities];

  const { error: activityError } = await supabase
    .from("activity_log")
    .upsert(activities, { onConflict: "id" });
  if (activityError) throw activityError;

  console.log("Relay demo data is ready.");
  console.table(demoUsers.map(({ email, displayName, role }) => ({ email, password, displayName, role })));
}

seed().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
