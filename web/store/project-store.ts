import { create } from "zustand";
import type { ActivityEntry, Membership, Message, ProjectSnapshot, Task } from "@relay/shared";

interface ProjectState {
  projectId: string | null;
  tasks: Task[];
  members: Membership[];
  activity: ActivityEntry[];
  messages: Message[];
  connected: boolean;
  removed: boolean;
  replaceSnapshot: (snapshot: ProjectSnapshot) => void;
  upsertTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  upsertMember: (member: Membership) => void;
  removeMember: (userId: string) => void;
  upsertActivity: (entry: ActivityEntry) => void;
  upsertMessage: (message: Message) => void;
  setConnected: (connected: boolean) => void;
  setRemoved: (removed: boolean) => void;
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) return [...items, item];
  const next = [...items];
  next[index] = item;
  return next;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectId: null,
  tasks: [],
  members: [],
  activity: [],
  messages: [],
  connected: false,
  removed: false,
  replaceSnapshot: (snapshot) =>
    set({
      projectId: snapshot.project.id,
      tasks: snapshot.tasks,
      members: snapshot.members,
      activity: snapshot.activity,
      messages: snapshot.messages,
      removed: false,
    }),
  upsertTask: (task) => set((state) => ({ tasks: upsertById(state.tasks, task) })),
  removeTask: (taskId) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== taskId) })),
  upsertMember: (member) =>
    set((state) => {
      const index = state.members.findIndex((candidate) => candidate.userId === member.userId);
      if (index === -1) return { members: [...state.members, member] };
      const members = [...state.members];
      members[index] = member;
      return { members };
    }),
  removeMember: (userId) =>
    set((state) => ({ members: state.members.filter((member) => member.userId !== userId) })),
  upsertActivity: (entry) =>
    set((state) => ({
      activity: [entry, ...state.activity.filter((candidate) => candidate.id !== entry.id)].slice(0, 50),
    })),
  upsertMessage: (message) => set((state) => ({ messages: upsertById(state.messages, message) })),
  setConnected: (connected) => set({ connected }),
  setRemoved: (removed) => set({ removed }),
}));
