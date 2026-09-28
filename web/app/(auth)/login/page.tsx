import Link from "next/link";
import { loginAction } from "../actions";

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
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </div>
        <button className="primary-button" type="submit">
          Sign in
        </button>
      </form>
      <p className="auth-switch">
        New to Relay? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}
