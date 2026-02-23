import { prisma } from "@/lib/prisma";
import { geocode } from "@/lib/geocode";
import { chromium } from "playwright";

const BASE_URL = "https://adcc-official.com";

// Pages that contain event listings — keyed by category label
const EVENT_PAGES: Array<{ label: string; url: string }> = [
  { label: "Trials", url: `${BASE_URL}/pages/trials` },
  { label: "Open US", url: `${BASE_URL}/pages/adcc-open-united-states` },
  { label: "Open Latin America", url: `${BASE_URL}/pages/adcc-open-latin-america` },
  { label: "Open Canada", url: `${BASE_URL}/pages/adcc-open-canada` },
  { label: "Open Mexico", url: `${BASE_URL}/pages/adcc-open-mexico` },
  { label: "Youth", url: `${BASE_URL}/pages/adcc-youth` },
  { label: "Worlds", url: `${BASE_URL}/pages/adcc-world-championships` },
];

interface AdccEvent {
  name: string;
  startDate: Date;
  location: string;
  registrationUrl: string;
  category: string;
}

// Parse events from ADCC page body text
// Pattern: "Month Day, Year\nCITY DETAILS\nREGISTER NOW" or "REGISTRATION COMING SOON"
function parsePageText(bodyText: string, pageUrl: string, category: string): AdccEvent[] {
  const events: AdccEvent[] = [];

  // Match date patterns: "March 14, 2026" or "APR 18-19" etc.
  const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:-(\d{1,2}))?,\s*(202\d)\b/gi;

  let match: RegExpExecArray | null;
  const positions: Array<{ index: number; date: Date; endDate?: Date }> = [];

  while ((match = datePattern.exec(bodyText)) !== null) {
    const month = match[1];
    const day = parseInt(match[2]);
    const dayEnd = match[3] ? parseInt(match[3]) : undefined;
    const year = parseInt(match[4]);

    const MONTHS: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    };
    const monthIdx = MONTHS[month.toLowerCase()];
    if (monthIdx === undefined) continue;

    const startDate = new Date(year, monthIdx, day);
    const endDate = dayEnd ? new Date(year, monthIdx, dayEnd) : undefined;
    positions.push({ index: match.index, date: startDate, endDate });
  }

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const nextPos = positions[i + 1];

    // Slice the text between this date and the next
    const chunk = bodyText
      .slice(pos.index, nextPos ? nextPos.index : pos.index + 300)
      .replace(/\s+/g, " ")
      .trim();

    // The location is between the date and "REGISTER NOW" / "REGISTRATION COMING SOON"
    // Format: "March 14, 2026 RIO DE JANEIRO, BRAZIL REGISTER NOW"
    const afterDate = chunk
      .replace(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:-\d{1,2})?,\s*202\d\s*/i, "")
      .replace(/\s*(REGISTER NOW|REGISTRATION COMING SOON|BOOK HOTEL|CITIZENSHIP REQUIREMENTS|SEE MORE).*/i, "")
      .trim();

    if (!afterDate || afterDate.length > 120) continue;

    // Build event name from category + location
    const name = `ADCC ${category} - ${afterDate}`;

    // Registration URL — for "REGISTER NOW" we use the page URL
    // Some events link to smoothcomp or similar — for now use page URL
    const registrationUrl = pageUrl;

    events.push({
      name,
      startDate: pos.date,
      location: afterDate,
      registrationUrl,
      category,
    });
  }

  return events;
}

export async function scrapeADCC(): Promise<{ count: number; method: string }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const allEvents: AdccEvent[] = [];

  try {
    for (const { label, url } of EVENT_PAGES) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        // Get the main content area text only (skip nav/footer)
        const bodyText = await page.evaluate(() => {
          // Remove nav, footer, header to isolate content
          const remove = document.querySelectorAll("nav, footer, header, .cart-notification, .announcement-bar");
          remove.forEach(el => el.remove());
          return document.body.innerText;
        });
        const events = parsePageText(bodyText, url, label);
        allEvents.push(...events);
      } catch (err) {
        console.warn(`[ADCC] Failed to scrape ${url}:`, err);
      }
    }
  } finally {
    await browser.close();
  }

  if (allEvents.length === 0) throw new Error("ADCC: no events found across all pages");

  // Deduplicate by date + location
  const seen = new Set<string>();
  const unique = allEvents.filter(e => {
    const key = `${e.startDate.toISOString().split("T")[0]}-${e.location.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let count = 0;
  const now = new Date();

  for (const e of unique) {
    // Skip events more than 60 days in the past
    if (e.startDate < new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)) continue;

    const stableKey = `adcc-${e.startDate.toISOString().split("T")[0]}-${e.location.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40)}`;

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

    await prisma.competition.upsert({
      where: { id: stableKey },
      create: {
        id: stableKey,
        source: "adcc",
        name: e.name,
        startDate: e.startDate,
        endDate: null,
        location: e.location,
        lat,
        lng,
        registrationUrl: e.registrationUrl,
        details: JSON.stringify({ category: e.category }),
      },
      update: {
        startDate: e.startDate,
        location: e.location,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        registrationUrl: e.registrationUrl,
      },
    });
    count++;
  }

  return { count, method: "playwright" };
}
