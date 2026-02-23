/**
 * One-time seed script to populate the database with competition data.
 * Run with: npx tsx scripts/seed.ts
 */

// Load .env and .env.local before anything else
import { readFileSync } from "fs";
import { resolve } from "path";

for (const file of [".env", ".env.local"]) {
  try {
    const content = readFileSync(resolve(process.cwd(), file), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // file doesn't exist, skip
  }
}

import { runAllScrapers } from "../src/lib/scrapers";

async function main() {
  console.log("Starting scrape for all sources...");
  const results = await runAllScrapers();

  for (const result of results) {
    if (result.error) {
      console.error(`[${result.source.toUpperCase()}] Error: ${result.error}`);
    } else {
      console.log(
        `[${result.source.toUpperCase()}] ${result.count} competitions upserted via ${result.method}`
      );
    }
  }

  const total = results.reduce((sum, r) => sum + r.count, 0);
  console.log(`\nDone! Total: ${total} competitions in database.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
