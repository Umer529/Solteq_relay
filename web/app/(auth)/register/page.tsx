import Link from "next/link";
import { registerAction } from "../actions";
import { SubmitButton } from "@/components/ui/submit-button";

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <div className="auth-form-card">
      <h1>Create your account</h1>
      <p>Use your work email and the name teammates know.</p>
      {error && (
        <div className="form-message" data-tone="error" role="alert">
          {error}
        </div>
      )}
      <form className="auth-form" action={registerAction}>
        <div className="field">
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={60}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <SubmitButton className="primary-button" pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>
      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
