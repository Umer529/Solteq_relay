import { MembersTab } from "@/components/members/members-tab";

interface MembersPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const notice = await searchParams;
  return <MembersTab notice={notice} />;
}
