import { prisma } from "@/lib/prisma";
import { geocode } from "@/lib/geocode";

// Real API discovered via Playwright network interception
const API_URL = "https://ibjjf.com/api/v1/events/upcomings.json";
const BASE_URL = "https://ibjjf.com";

interface IbjjfChampionship {
  name: string;
  slug: string;
  publishedPage: boolean;
  urlLogo?: string;
  logoBaseColor?: string;
  fontColor?: string;
  eventMonth: string;        // e.g. "Mar"
  eventIntervalDays: string; // e.g. "Mar 24* - Mar 29"
  city: string;
  state: string;
  country: string;
}

interface IbjjfResponse {
  championships: IbjjfChampionship[];
}

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/**
 * Parse "Mar 24* - Mar 29" → { start: Date, end: Date }
 * Strips asterisks, infers the year from current date
 */
function parseDateRange(
  intervalDays: string,
  eventMonth: string
): { start: Date; end: Date } | null {
  // Clean up asterisks and extra whitespace
  const clean = intervalDays.replace(/\*/g, "").trim();

  // Match patterns like "Mar 24 - Mar 29" or "Mar 24 - 29" or "Mar 24"
  const fullRange = clean.match(
    /^([A-Za-z]+)\s+(\d+)\s*[-–]\s*([A-Za-z]+)\s+(\d+)$/
  );
  const shortRange = clean.match(/^([A-Za-z]+)\s+(\d+)\s*[-–]\s*(\d+)$/);
  const single = clean.match(/^([A-Za-z]+)\s+(\d+)$/);

  let startMonth: number, startDay: number, endMonth: number, endDay: number;

  if (fullRange) {
    startMonth = MONTH_MAP[fullRange[1]] ?? MONTH_MAP[eventMonth] ?? 0;
    startDay = parseInt(fullRange[2]);
    endMonth = MONTH_MAP[fullRange[3]] ?? startMonth;
    endDay = parseInt(fullRange[4]);
  } else if (shortRange) {
    startMonth = MONTH_MAP[shortRange[1]] ?? MONTH_MAP[eventMonth] ?? 0;
    startDay = parseInt(shortRange[2]);
    endMonth = startMonth;
    endDay = parseInt(shortRange[3]);
  } else if (single) {
    startMonth = MONTH_MAP[single[1]] ?? MONTH_MAP[eventMonth] ?? 0;
    startDay = parseInt(single[2]);
    endMonth = startMonth;
    endDay = startDay;
  } else {
    return null;
  }

  // Determine year: use current year; if month has already passed, use next year
  const now = new Date();
  let year = now.getFullYear();
  if (startMonth < now.getMonth() || (startMonth === now.getMonth() && startDay < now.getDate() - 30)) {
    year += 1;
  }

  const start = new Date(year, startMonth, startDay);
  const end = new Date(year, endMonth, endDay);

  if (isNaN(start.getTime())) return null;
  return { start, end };
}

export async function scrapeIBJJF(): Promise<{ count: number; method: string }> {
  const res = await fetch(API_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://ibjjf.com/events/championships",
      Accept: "application/json, text/javascript, */*; q=0.01",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new Error(`IBJJF API returned ${res.status}`);
  }

  const data: IbjjfResponse = await res.json();
  const championships = data.championships ?? [];

  if (championships.length === 0) {
    throw new Error("IBJJF API returned 0 championships");
  }

  let count = 0;

  for (const c of championships) {
    if (!c.name || !c.eventIntervalDays) continue;

    const parsed = parseDateRange(c.eventIntervalDays, c.eventMonth);
    if (!parsed) {
      console.warn(`[IBJJF] Could not parse date: "${c.eventIntervalDays}" for "${c.name}"`);
      continue;
    }

    const { start: startDate, end: endDate } = parsed;
    const locationParts = [c.city, c.state, c.country].filter(Boolean);
    const location = locationParts.join(", ");
    const registrationUrl = c.slug
      ? `${BASE_URL}/events/${c.slug}`
      : `${BASE_URL}/events/championships`;

    const stableKey = `ibjjf-${c.slug || c.name}-${startDate.toISOString().split("T")[0]}`;

    // Geocode (skip if already in DB with coords)
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
        source: "ibjjf",
        name: c.name,
        startDate,
        endDate,
        location,
        lat,
        lng,
        registrationUrl,
        details: JSON.stringify({
          eventMonth: c.eventMonth,
          eventIntervalDays: c.eventIntervalDays,
          urlLogo: c.urlLogo,
        }),
      },
      update: {
        startDate,
        endDate,
        location,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        registrationUrl,
      },
    });
    count++;
  }

  return { count, method: "api" };
}
