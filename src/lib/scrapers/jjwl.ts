import { prisma } from "@/lib/prisma";
import { geocode } from "@/lib/geocode";

// Real endpoint discovered via Playwright network interception
const API_URL = "https://www.jjworldleague.com/ajax/new_load_events.php";
const EVENT_BASE_URL = "https://www.jjworldleague.com/events";

interface JjwlEvent {
  id: string;
  estatus: string;       // "1" = upcoming, "3" = past
  name: string;
  urlfriendly: string;
  datebeg: string;       // YYYY-MM-DD — the actual event date (misleading name)
  dateend: string;       // YYYY-MM-DD — registration deadline
  city: string;
  address: string;
  shortdescription?: string;
  GI: string;            // "1" = Gi available
  NOGI: string;          // "1" = No-Gi available
  month?: string;
  day?: string;
  year?: string;
  monthB?: string;
  dayB?: string;
  yearB?: string;
}

async function fetchEvents(type: "next" | "past"): Promise<JjwlEvent[]> {
  const body = new URLSearchParams({ type, age: "0" });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://www.jjworldleague.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`JJWL ${type} responded ${res.status}`);

  const text = await res.text();
  // Content-Type is incorrectly set to text/html on this endpoint
  return JSON.parse(text) as JjwlEvent[];
}

export async function scrapeJJWL(): Promise<{ count: number; method: string }> {
  // Fetch both upcoming and recent past events
  const [nextEvents, pastEvents] = await Promise.allSettled([
    fetchEvents("next"),
    fetchEvents("past"),
  ]);

  const events: JjwlEvent[] = [];
  if (nextEvents.status === "fulfilled") events.push(...nextEvents.value);
  if (pastEvents.status === "fulfilled") events.push(...pastEvents.value);

  if (events.length === 0) {
    throw new Error("JJWL returned 0 events from both endpoints");
  }

  let count = 0;

  for (const e of events) {
    if (!e.name || !e.datebeg) continue;

    // datebeg is the actual event date (despite the misleading field name)
    let startDate: Date;
    try {
      startDate = new Date(e.datebeg + "T00:00:00Z");
      if (isNaN(startDate.getTime())) continue;
    } catch {
      continue;
    }

    // Build location — prefer full address for geocoding accuracy
    const location = e.address
      ? `${e.city}, ${e.address.split(",").slice(-2).join(",").trim()}`
      : e.city || "TBD";

    const geocodeInput = e.address || e.city;
    const registrationUrl = e.urlfriendly
      ? `${EVENT_BASE_URL}/${e.urlfriendly}`
      : "https://www.jjworldleague.com/registration/";

    const stableKey = `jjwl-${e.id}-${e.datebeg}`;

    // Geocode (skip if already in DB with coords)
    let lat: number | null = null;
    let lng: number | null = null;

    if (geocodeInput) {
      const existing = await prisma.competition.findUnique({
        where: { id: stableKey },
        select: { lat: true, lng: true },
      });

      if (existing?.lat != null && existing?.lng != null) {
        lat = existing.lat;
        lng = existing.lng;
      } else {
        const coords = await geocode(geocodeInput);
        lat = coords?.lat ?? null;
        lng = coords?.lng ?? null;
      }
    }

    const isGi = e.GI === "1";
    const isNogi = e.NOGI === "1";
    const isKids = /(youth|junior|kids|juvenile)/i.test(e.name);
    const giNogi = [isGi ? "Gi" : null, isNogi ? "No-Gi" : null].filter(Boolean).join(" / ");

    await prisma.competition.upsert({
      where: { id: stableKey },
      create: {
        id: stableKey,
        source: "jjwl",
        name: e.name,
        startDate,
        endDate: null,
        location,
        lat,
        lng,
        registrationUrl,
        gi: isGi,
        nogi: isNogi,
        kids: isKids,
        details: JSON.stringify({
          id: e.id,
          address: e.address,
          giNogi,
          shortdescription: e.shortdescription,
          estatus: e.estatus,
        }),
      },
      update: {
        startDate,
        location,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        registrationUrl,
        gi: isGi,
        nogi: isNogi,
        kids: isKids,
      },
    });
    count++;
  }

  return { count, method: "api" };
}
