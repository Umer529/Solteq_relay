import type { ProjectSnapshot } from "@relay/shared";
import { redirect } from "next/navigation";
import { BoardClient } from "@/components/board/board-client";
import { apiRequest } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const snapshot = await apiRequest<ProjectSnapshot>(`/projects/${id}/snapshot`, { method: "GET" });

  return <BoardClient currentUserId={user.id} initialSnapshot={snapshot} />;
}
