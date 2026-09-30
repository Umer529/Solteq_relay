import { loginAction } from "../actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordInput } from "@/components/ui/password-input";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;

  return (
    <div className="auth-form-card">
      <h1>Sign in to Relay</h1>
      <p>Continue to your projects and team updates.</p>
      {(error || message) && (
        <div className="form-message" data-tone={error ? "error" : "info"} role="status">
          {error ?? message}
        </div>
      )}
      <form className="auth-form" action={loginAction}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            minLength={8}
            placeholder="Enter your password"
            required
          />
        </div>
        <SubmitButton className="primary-button" pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>
      <p className="auth-switch" style={{ color: "var(--muted, #94a3b8)", fontSize: "12px", marginTop: "1rem", textAlign: "center" }}>
        New accounts are provisioned directly by project owners and admins.
      </p>
    </div>
  );
}
