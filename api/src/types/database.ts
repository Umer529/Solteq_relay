import type { Membership, TaskPriority, TaskStatus } from "@relay/shared";

export interface ProjectDbRow {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface ProfileDbRow {
  id: string;
  email: string;
  display_name: string;
  avatar_color: string;
  created_at?: string;
}

export interface MemberDbRow {
  project_id: string;
  user_id: string;
  role: Membership["role"];
  created_at: string;
  profiles: ProfileDbRow | null;
}

export interface TaskDbRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityDbRow {
  id: string;
  project_id: string;
  actor_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface MessageDbRow {
  id: string;
  project_id: string;
  user_id: string;
  body: string;
  edited_at: string | null;
  created_at: string;
}

export interface ContributionDbRow {
  project_id: string;
  user_id: string;
  completed: number;
}

export interface ProgressDbRow {
  total: number;
  done: number;
}

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: ProjectDbRow;
        Insert: Partial<ProjectDbRow>;
        Update: Partial<ProjectDbRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileDbRow;
        Insert: Partial<ProfileDbRow>;
        Update: Partial<ProfileDbRow>;
        Relationships: [];
      };
      memberships: {
        Row: {
          project_id: string;
          user_id: string;
          role: Membership["role"];
          created_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          role: Membership["role"];
          created_at?: string;
        };
        Update: {
          project_id?: string;
          user_id?: string;
          role?: Membership["role"];
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: TaskDbRow;
        Insert: Partial<TaskDbRow>;
        Update: Partial<TaskDbRow>;
        Relationships: [];
      };
      activity_log: {
        Row: ActivityDbRow;
        Insert: Partial<ActivityDbRow>;
        Update: Partial<ActivityDbRow>;
        Relationships: [];
      };
      messages: {
        Row: MessageDbRow;
        Insert: Partial<MessageDbRow>;
        Update: Partial<MessageDbRow>;
        Relationships: [];
      };
    };
    Views: {
      project_progress: {
        Row: ProgressDbRow;
        Relationships: [];
      };
      member_contributions: {
        Row: ContributionDbRow;
        Relationships: [];
      };
    };
    Functions: {
      create_project: {
        Args: { p_name: string; p_description: string | null; p_actor_id: string };
        Returns: ProjectDbRow;
      };
      update_project: {
        Args: { p_project_id: string; p_name: string; p_description: string | null; p_actor_id: string };
        Returns: ProjectDbRow;
      };
      delete_project: {
        Args: { p_project_id: string; p_actor_id: string };
        Returns: void;
      };
      add_project_member: {
        Args: { p_project_id: string; p_user_id: string; p_role: Membership["role"]; p_actor_id: string };
        Returns: { project_id: string; user_id: string; role: Membership["role"]; created_at: string };
      };
      change_member_role: {
        Args: { p_project_id: string; p_user_id: string; p_new_role: Membership["role"]; p_actor_id: string };
        Returns: { project_id: string; user_id: string; role: Membership["role"]; created_at: string };
      };
      remove_project_member: {
        Args: { p_project_id: string; p_user_id: string; p_actor_id: string };
        Returns: void;
      };
      create_task: {
        Args: {
          p_project_id: string;
          p_title: string;
          p_description?: string | null;
          p_priority: string;
          p_assignee_id?: string | null;
          p_due_date?: string | null;
          p_position: number;
          p_actor_id: string;
        };
        Returns: TaskDbRow;
      };
      update_task: {
        Args: {
          p_task_id: string;
          p_title: string;
          p_description?: string | null;
          p_priority: string;
          p_assignee_id?: string | null;
          p_due_date?: string | null;
          p_position?: number;
          p_actor_id: string;
        };
        Returns: TaskDbRow;
      };
      change_task_status: {
        Args: {
          p_task_id: string;
          p_status: string;
          p_position: number;
          p_actor_id: string;
        };
        Returns: TaskDbRow;
      };
      delete_task: {
        Args: { p_task_id: string; p_actor_id: string };
        Returns: void;
      };
      post_message: {
        Args: { p_project_id: string; p_user_id: string; p_body: string };
        Returns: MessageDbRow;
      };
      update_message: {
        Args: { p_message_id: string; p_user_id: string; p_body: string };
        Returns: MessageDbRow;
      };
      delete_message: {
        Args: { p_message_id: string; p_user_id: string };
        Returns: void;
      };
    };
  };
}
