import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const buildDirectory = resolve("web/.next");
const forbiddenNames = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_JWT_SECRET"];
const configuredSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!existsSync(buildDirectory)) {
  console.error("web/.next does not exist. Run the web build before this check.");
  process.exit(1);
}

function filesIn(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });
}

const needles = configuredSecret
  ? [...forbiddenNames, configuredSecret]
  : forbiddenNames;
const leakedFiles = filesIn(buildDirectory).filter((file) => {
  try {
    const contents = readFileSync(file, "utf8");
    return needles.some((needle) => contents.includes(needle));
  } catch {
    return false;
  }
});

if (leakedFiles.length > 0) {
  console.error("Potential backend secret material found in the web build:");
  leakedFiles.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Web build contains no backend secret names or configured service-role key.");
