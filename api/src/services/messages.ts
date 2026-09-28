import type { Message } from "@relay/shared";
import { throwDatabaseError } from "../lib/database-error.js";
import { callRpc, getSupabaseAdmin } from "../lib/supabase-admin.js";
import type { MessageDbRow } from "../types/database.js";

function mapMessage(row: MessageDbRow): Message {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    body: row.body,
    editedAt: row.edited_at,
    createdAt: row.created_at,
  };
}

export async function postMessage(projectId: string, body: string, actorId: string): Promise<Message> {
  const { data, error } = await callRpc<MessageDbRow>("post_message", {
    p_project_id: projectId,
    p_body: body,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
  if (!data) throwDatabaseError({ code: "P0002", message: "Failed to post message." });
  return mapMessage(data);
}

export async function getMessages(
  projectId: string,
  before: string | undefined,
  limit: number,
): Promise<Message[]> {
  let query = getSupabaseAdmin()
    .from("messages")
    .select<string, MessageDbRow>("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throwDatabaseError(error);
  return (data ?? []).slice().reverse().map(mapMessage);
}

export async function getMessage(projectId: string, messageId: string): Promise<Message> {
  const { data, error } = await getSupabaseAdmin()
    .from("messages")
    .select<string, MessageDbRow>("*")
    .eq("project_id", projectId)
    .eq("id", messageId)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  if (!data) throwDatabaseError({ code: "P0002", message: "Message not found." });
  return mapMessage(data);
}

export async function updateMessage(messageId: string, body: string, actorId: string): Promise<Message> {
  const { data, error } = await callRpc<MessageDbRow>("update_message", {
    p_message_id: messageId,
    p_body: body,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
  if (!data) throwDatabaseError({ code: "P0002", message: "Failed to update message." });
  return mapMessage(data);
}

export async function deleteMessage(messageId: string, actorId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("delete_message", {
    p_message_id: messageId,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
}
