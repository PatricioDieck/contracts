import { readFile } from "node:fs/promises";

/**
 * Minimal .env loader (no dependency).
 * - Only sets keys that are not already present in process.env
 * - Ignores blank lines and lines starting with '#'
 * - Supports KEY=VALUE with optional single/double quotes
 */
export async function loadDotEnv(path = ".env") {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (!key) continue;
    if (process.env[key] !== undefined) continue;

    // strip quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}



