import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | undefined;

export function getConfig(): Config {
  cachedConfig ??= configSchema.parse(process.env);
  return cachedConfig;
}
