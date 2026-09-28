import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const migrationsDirectory = resolve("supabase/migrations");
const outputPath = resolve("supabase/setup.sql");
const migrationNames = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith(".sql"))
  .sort();

const sections = await Promise.all(
  migrationNames.map(async (name) => {
    const sql = (await readFile(join(migrationsDirectory, name), "utf8")).trim();
    return `-- -----------------------------------------------------------------------------\n-- ${name}\n-- -----------------------------------------------------------------------------\n\n${sql}`;
  }),
);

const header = `-- Relay database setup\n-- Generated from supabase/migrations. Run once in a new Supabase project's SQL Editor.\n-- Regenerate with: npm run db:bundle`;

await writeFile(outputPath, `${header}\n\n${sections.join("\n\n")}\n`, "utf8");
console.log(`Wrote ${migrationNames.length} migrations to supabase/setup.sql`);
