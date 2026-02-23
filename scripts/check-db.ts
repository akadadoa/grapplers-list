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
  } catch { /* skip */ }
}

import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const total = await prisma.competition.count();
  const geocoded = await prisma.competition.count({ where: { lat: { not: null } } });
  console.log(`Total: ${total} | Geocoded (has lat/lng): ${geocoded} | Missing coords: ${total - geocoded}`);

  const sample = await prisma.competition.findFirst({
    where: { lat: { not: null } },
    select: { name: true, lat: true, lng: true, location: true, source: true },
  });
  if (sample) console.log("Sample geocoded:", JSON.stringify(sample, null, 2));

  const missing = await prisma.competition.findFirst({
    where: { lat: null },
    select: { name: true, location: true, source: true },
  });
  if (missing) console.log("Sample missing coords:", JSON.stringify(missing, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
