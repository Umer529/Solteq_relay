import { createRemoteJWKSet, jwtVerify } from "jose";
import { getConfig } from "../config.js";
import { AppError } from "./errors.js";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

let keySet: ReturnType<typeof createRemoteJWKSet> | undefined;

function getKeySet(): ReturnType<typeof createRemoteJWKSet> {
  const { SUPABASE_URL } = getConfig();
  keySet ??= createRemoteJWKSet(
    new URL("/auth/v1/.well-known/jwks.json", SUPABASE_URL),
  );
  return keySet;
}

export async function verifyAccessToken(token: string): Promise<AuthenticatedUser> {
  const { SUPABASE_URL } = getConfig();

  try {
    const { payload } = await jwtVerify(token, getKeySet(), {
      issuer: `${SUPABASE_URL}/auth/v1`,
      audience: "authenticated",
    });

    if (!payload.sub) {
      throw new Error("JWT has no subject.");
    }

    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
    };
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "The access token is invalid or expired.");
  }
}
