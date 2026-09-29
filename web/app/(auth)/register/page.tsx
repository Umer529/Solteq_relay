import Link from "next/link";
import { registerAction } from "../actions";
import { SubmitButton } from "@/components/ui/submit-button";

interface RegisterPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error, message } = await searchParams;

  return (
    <div className="auth-form-card">
      <h1>Create your account</h1>
      <p>Register and choose your initial role in Relay.</p>
      {(error || message) && (
        <div className="form-message" data-tone={error ? "error" : "info"} role="status">
          {error ?? message}
        </div>
      )}
      <form className="auth-form" action={registerAction}>
        <div className="field">
          <label htmlFor="displayName">Full Name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="e.g. Jane Doe"
            maxLength={60}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="role">Desired Role</label>
          <select id="role" name="role" defaultValue="member">
            <option value="member">Member (Create and edit tasks, collaborate)</option>
            <option value="admin">Admin (Manage members, board, and settings)</option>
            <option value="viewer">Viewer (Read-only access)</option>
          </select>
          <small style={{ color: "var(--muted, #94a3b8)", fontSize: "11px", marginTop: "4px", display: "block" }}>
            Project owners can also update your role at any time in their projects.
          </small>
        </div>
        <SubmitButton className="primary-button" pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>
      <p className="auth-switch" style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "13px" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--accent, #6366f1)", fontWeight: 600, textDecoration: "underline" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
