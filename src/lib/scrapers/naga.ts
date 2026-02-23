import { prisma } from "@/lib/prisma";
import { geocode } from "@/lib/geocode";
import { chromium } from "playwright";

const EVENTS_URL = "https://www.nagafighter.com/events/";

interface NagaEvent {
  title: string;
  href: string;
  dateText: string;
  venueText: string;
}

const MONTH_NAMES: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function parseNagaDate(dateText: string): Date | null {
  // Format: "February 21 @ 8:00 am - 5:00 pm"
  const m = dateText.match(/^([A-Za-z]+)\s+(\d+)/);
  if (!m) return null;

  const monthIdx = MONTH_NAMES[m[1].toLowerCase()];
  if (monthIdx === undefined) return null;
  const day = parseInt(m[2]);

  // Infer year: if month is earlier in the year than today and we're past that date, next year
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, monthIdx, day);
  if (candidate < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) {
    year += 1;
  }

  return new Date(year, monthIdx, day);
}

function parseVenue(venueText: string): string {
  // Format: "South Suburban Sports Complex\t\n\t\n\t\t4810 E County Line Rd., Highlands Ranch, CO, United States"
  // Extract just the address part (after venue name)
  const lines = venueText.split(/[\t\n]+/).map(l => l.trim()).filter(Boolean);
  // Last line is usually the address
  return lines.slice(-1)[0] || lines[0] || venueText.trim();
}

export async function scrapeNAGA(): Promise<{ count: number; method: string }> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  let rawEvents: NagaEvent[] = [];

  try {
    await page.goto(EVENTS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    rawEvents = await page.evaluate(() => {
      const results: NagaEvent[] = [];
      const articles = document.querySelectorAll(".tribe-events-calendar-list__event");

      for (const art of Array.from(articles)) {
        const titleEl = art.querySelector(".tribe-events-calendar-list__event-title a");
        const title = titleEl?.textContent?.trim() ?? "";
        const href = (titleEl as HTMLAnchorElement | null)?.href ?? "";

        // Date text
        const dateEl = art.querySelector(
          ".tribe-event-date-start, [class*='datetime'], time, [class*='tribe-events-schedule']"
        );
        const dateText = dateEl?.textContent?.trim() ?? "";

        // Venue — grab full text of the venue/location block
        const venueEl = art.querySelector("[class*='venue'], [class*='location']");
        const venueText = venueEl?.textContent?.trim() ?? "";

        if (title) results.push({ title, href, dateText, venueText });
      }
      return results;
    });
  } finally {
    await browser.close();
  }

  if (rawEvents.length === 0) throw new Error("NAGA: no events found");

  let count = 0;

  for (const e of rawEvents) {
    const startDate = parseNagaDate(e.dateText);
    if (!startDate) {
      console.warn(`[NAGA] Could not parse date: "${e.dateText}" for "${e.title}"`);
      continue;
    }

    const location = parseVenue(e.venueText);
    const stableKey = `naga-${e.title.toLowerCase().replace(/\s+/g, "-").slice(0, 60)}-${startDate.toISOString().split("T")[0]}`;

    let lat: number | null = null;
    let lng: number | null = null;

    if (location) {
      const existing = await prisma.competition.findUnique({
        where: { id: stableKey },
        select: { lat: true, lng: true },
      });
      if (existing?.lat != null && existing?.lng != null) {
        lat = existing.lat;
        lng = existing.lng;
      } else {
        const coords = await geocode(location);
        lat = coords?.lat ?? null;
        lng = coords?.lng ?? null;
      }
    }

    await prisma.competition.upsert({
      where: { id: stableKey },
      create: {
        id: stableKey,
        source: "naga",
        name: e.title,
        startDate,
        endDate: null,
        location,
        lat,
        lng,
        registrationUrl: e.href || EVENTS_URL,
        details: JSON.stringify({ dateText: e.dateText, venueText: e.venueText }),
      },
      update: {
        startDate,
        location,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        registrationUrl: e.href || EVENTS_URL,
      },
    });
    count++;
  }

  return { count, method: "playwright" };
}
