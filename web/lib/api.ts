import { createClient } from "@/lib/supabase/server";

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit): Promise<T> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new ApiError("Your session has expired. Please sign in again.", 401);

  const configuredUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const candidateUrls = Array.from(
    new Set([
      configuredUrl,
      configuredUrl.includes("localhost")
        ? configuredUrl.replace("localhost", "127.0.0.1")
        : configuredUrl.replace("127.0.0.1", "localhost"),
    ]),
  );

  let response: Response | undefined;
  for (const baseUrl of candidateUrls) {
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
        cache: "no-store",
      });
      break;
    } catch {
      // Try next candidate
    }
  }

  if (!response) {
    throw new ApiError(
      "Could not connect to the API server. Please ensure the backend service is running.",
      503,
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    const defaultMsg =
      response.status === 404
        ? "This user does not exist. No Relay account was found for this email."
        : response.status === 403
          ? "You do not have permission to perform this action."
          : "The request could not be completed.";
    throw new ApiError(body.error?.message ?? defaultMsg, response.status);
  }

  if (response.status === 204) return undefined as T;
  const body = (await response.json()) as { data: T };
  return body.data;
}
