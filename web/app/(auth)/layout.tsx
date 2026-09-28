import { Radio } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="auth-shell">
      <aside className="auth-context">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">
            <Radio size={16} strokeWidth={1.8} />
          </span>
          Relay
        </div>
        <div className="auth-context-copy">
          <h2>One place for the work and the conversation.</h2>
          <p>
            Keep requirements, decisions, and project updates close enough that
            nobody has to reconstruct the story later.
          </p>
        </div>
        <p className="auth-context-footer">Built for focused project teams.</p>
      </aside>
      <section className="auth-form-side" id="main-content">
        <div className="auth-theme"><ThemeToggle compact /></div>
        {children}
      </section>
    </main>
  );
}
