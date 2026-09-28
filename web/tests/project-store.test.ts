import { beforeEach, describe, expect, it } from "vitest";
import type { ActivityEntry, Membership, Message, ProjectSnapshot, Task } from "@relay/shared";
import { useProjectStore } from "../store/project-store";

const mockSnapshot: ProjectSnapshot = {
  project: {
    id: "proj-1",
    name: "Alpha Project",
    description: "Alpha description",
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  members: [
    {
      projectId: "proj-1",
      userId: "user-1",
      role: "owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      profile: {
        id: "user-1",
        email: "owner@test.com",
        displayName: "Owner",
        avatarColor: "#112233",
      },
    },
  ],
  tasks: [
    {
      id: "task-1",
      projectId: "proj-1",
      title: "Initial Task",
      description: null,
      status: "todo",
      priority: "medium",
      position: 1000,
      createdBy: "user-1",
      assigneeId: null,
      completedBy: null,
      completedAt: null,
      dueDate: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  progress: {
    total: 1,
    done: 0,
  },
  contributions: [
    {
      projectId: "proj-1",
      userId: "user-1",
      completed: 0,
    },
  ],
  messages: [
    {
      id: "msg-1",
      projectId: "proj-1",
      userId: "user-1",
      body: "Welcome to project",
      createdAt: "2026-01-01T00:00:00.000Z",
      editedAt: null,
    },
  ],
  activity: [
    {
      id: "act-1",
      projectId: "proj-1",
      actorId: "user-1",
      type: "project.created",
      payload: { name: "Alpha Project" },
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

describe("useProjectStore characterization tests", () => {
  beforeEach(() => {
    useProjectStore.getState().replaceSnapshot(mockSnapshot);
  });

  it("loads a snapshot correctly into store state", () => {
    const state = useProjectStore.getState();
    expect(state.projectId).toBe("proj-1");
    expect(state.tasks).toHaveLength(1);
    expect(state.members).toHaveLength(1);
    expect(state.messages).toHaveLength(1);
    expect(state.activity).toHaveLength(1);
    expect(state.removed).toBe(false);
  });

  it("upserts and updates tasks optimistically by id", () => {
    const store = useProjectStore.getState();
    const newTask: Task = {
      id: "task-2",
      projectId: "proj-1",
      title: "Second Task",
      description: null,
      status: "in_progress",
      priority: "high",
      position: 2000,
      createdBy: "user-1",
      assigneeId: null,
      completedBy: null,
      completedAt: null,
      dueDate: null,
      createdAt: "2026-01-01T01:00:00.000Z",
      updatedAt: "2026-01-01T01:00:00.000Z",
    };

    store.upsertTask(newTask);
    expect(useProjectStore.getState().tasks).toHaveLength(2);

    // Update existing task without duplicating
    const updatedTask: Task = { ...newTask, title: "Second Task Updated", status: "done" };
    store.upsertTask(updatedTask);
    const tasks = useProjectStore.getState().tasks;
    expect(tasks).toHaveLength(2);
    expect(tasks.find((t) => t.id === "task-2")?.title).toBe("Second Task Updated");
    expect(tasks.find((t) => t.id === "task-2")?.status).toBe("done");

    // Remove task
    store.removeTask("task-2");
    expect(useProjectStore.getState().tasks).toHaveLength(1);
    expect(useProjectStore.getState().tasks.find((t) => t.id === "task-2")).toBeUndefined();
  });

  it("upserts and updates project members by userId", () => {
    const store = useProjectStore.getState();
    const newMember: Membership = {
      projectId: "proj-1",
      userId: "user-2",
      role: "member",
      createdAt: "2026-01-01T02:00:00.000Z",
      profile: {
        id: "user-2",
        email: "member@test.com",
        displayName: "Teammate",
        avatarColor: "#445566",
      },
    };

    store.upsertMember(newMember);
    expect(useProjectStore.getState().members).toHaveLength(2);

    // Update role
    store.upsertMember({ ...newMember, role: "admin" });
    const members = useProjectStore.getState().members;
    expect(members).toHaveLength(2);
    expect(members.find((m) => m.userId === "user-2")?.role).toBe("admin");

    // Remove member
    store.removeMember("user-2");
    expect(useProjectStore.getState().members).toHaveLength(1);
  });

  it("prepends activity entries and maintains max 50 entries", () => {
    const store = useProjectStore.getState();
    for (let i = 2; i <= 60; i++) {
      const entry: ActivityEntry = {
        id: `act-${i}`,
        projectId: "proj-1",
        actorId: "user-1",
        type: "task.created",
        payload: { title: `Task ${i}` },
        createdAt: new Date(Date.now() + i * 1000).toISOString(),
      };
      store.upsertActivity(entry);
    }

    const state = useProjectStore.getState();
    expect(state.activity).toHaveLength(50);
    // Most recent is at the beginning
    expect(state.activity[0]?.id).toBe("act-60");
  });

  it("handles messages upsert and deletion", () => {
    const store = useProjectStore.getState();
    const newMsg: Message = {
      id: "msg-2",
      projectId: "proj-1",
      userId: "user-1",
      body: "Another message",
      createdAt: "2026-01-01T03:00:00.000Z",
      editedAt: null,
    };
    store.upsertMessage(newMsg);
    expect(useProjectStore.getState().messages).toHaveLength(2);

    store.removeMessage("msg-2");
    expect(useProjectStore.getState().messages).toHaveLength(1);
    expect(useProjectStore.getState().messages[0]?.id).toBe("msg-1");
  });

  it("deduplicates onlineUserIds and manages typing users", () => {
    const store = useProjectStore.getState();
    store.setOnlineUserIds(["u1", "u2", "u1", "u3"]);
    expect(useProjectStore.getState().onlineUserIds).toEqual(["u1", "u2", "u3"]);

    store.setTypingUser({ userId: "u1", name: "Alice" });
    store.setTypingUser({ userId: "u2", name: "Bob" });
    expect(useProjectStore.getState().typingUsers).toHaveLength(2);

    store.removeTypingUser("u1");
    expect(useProjectStore.getState().typingUsers).toEqual([{ userId: "u2", name: "Bob" }]);
  });
});
