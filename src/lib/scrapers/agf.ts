import { prisma } from "@/lib/prisma";
import { geocode } from "@/lib/geocode";
import { chromium } from "playwright";

const BASE_URL = "https://www.americangrapplingfederation.com";
const TOURNAMENTS_URL = `${BASE_URL}/tournaments`;

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

interface AgfEvent {
  name: string;
  month: string;
  day: number;
  year: number;
  location: string;
  registrationUrl: string;
}

export async function scrapeAGF(): Promise<{ count: number; method: string }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  let events: AgfEvent[] = [];

  try {
    await page.goto(TOURNAMENTS_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    events = await page.evaluate(() => {
      const results: AgfEvent[] = [];
      const rows = document.querySelectorAll("tbody tr");
      let currentMonth = "";
      let currentDay = 0;
      const now = new Date();

      for (const row of Array.from(rows)) {
        // Date row: has span.month and span.day
        const monthEl = row.querySelector("span.month");
        const dayEl = row.querySelector("span.day");
        if (monthEl && dayEl) {
          currentMonth = monthEl.textContent?.trim() ?? "";
          currentDay = parseInt(dayEl.textContent?.trim() ?? "0");
          continue;
        }

        // Event row: has <a> with span.event-title
        const link = row.querySelector("a");
        const titleEl = row.querySelector("span.event-title");
        const detailsEl = row.querySelector("span.event-details");
        if (!link || !titleEl) continue;

        const name = titleEl.textContent?.trim() ?? "";
        const location = detailsEl?.textContent?.trim() ?? "";
        const href = (link as HTMLAnchorElement).href;

        if (!name || !currentMonth) continue;

        // Extract year from event title (e.g. "2026 Destin Championships")
        const yearMatch = name.match(/\b(202\d)\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : now.getFullYear();

        results.push({ name, month: currentMonth, day: currentDay, year, location, registrationUrl: href });
      }
      return results;
    });
  } finally {
    await browser.close();
  }

  if (events.length === 0) throw new Error("AGF: no events extracted from HTML");

  let count = 0;
  const now = new Date();

  for (const e of events) {
    const monthIdx = MONTH_MAP[e.month];
    if (monthIdx === undefined || !e.day) continue;

    const startDate = new Date(e.year, monthIdx, e.day);
    if (isNaN(startDate.getTime())) continue;

    // Skip events more than 60 days in the past
    if (startDate < new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)) continue;

    const stableKey = `agf-${e.name.toLowerCase().replace(/\s+/g, "-")}-${startDate.toISOString().split("T")[0]}`;

    let lat: number | null = null;
    let lng: number | null = null;

    if (e.location) {
      const existing = await prisma.competition.findUnique({
        where: { id: stableKey },
        select: { lat: true, lng: true },
      });
      if (existing?.lat != null && existing?.lng != null) {
        lat = existing.lat;
        lng = existing.lng;
      } else {
        const coords = await geocode(e.location);
        lat = coords?.lat ?? null;
        lng = coords?.lng ?? null;
      }
    }

    const isKids = /(youth|junior|kids|juvenile)/i.test(e.name);

    await prisma.competition.upsert({
      where: { id: stableKey },
      create: {
        id: stableKey,
        source: "agf",
        name: e.name,
        startDate,
        endDate: null,
        location: e.location,
        lat,
        lng,
        registrationUrl: e.registrationUrl,
        gi: true,
        nogi: true,
        kids: isKids,
        details: null,
      },
      update: {
        startDate,
        location: e.location,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        registrationUrl: e.registrationUrl,
        gi: true,
        nogi: true,
        kids: isKids,
      },
    });
    count++;
  }

  return { count, method: "playwright" };
}
