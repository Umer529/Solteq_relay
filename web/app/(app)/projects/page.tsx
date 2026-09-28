import { Radio } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="foundation-shell">
      <header className="foundation-bar">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">
            <Radio size={16} strokeWidth={1.8} />
          </span>
          Relay
        </div>
        <form action={logoutAction}>
          <button className="secondary-button" type="submit">
            Sign out
          </button>
        </form>
      </header>
      <section className="foundation-main">
        <h1>Your workspace is ready</h1>
        <p>
          Signed in as {user?.email}. Projects and team membership will appear here in the
          next milestone.
        </p>
      </section>
    </main>
  );
}
