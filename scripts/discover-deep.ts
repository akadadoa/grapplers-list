import { chromium } from "playwright";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── AGF: scrape HTML from /tournaments ─────────────────────────────────────
async function inspectAGF() {
  console.log("\n====== AGF HTML STRUCTURE ======");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });

  // Also intercept any XHR calls we may have missed
  const xhr: string[] = [];
  page.on("response", async (res) => {
    const u = res.url();
    const ct = res.headers()["content-type"] ?? "";
    if ((ct.includes("json") || u.includes("api")) && !u.includes("google") && !u.includes("facebook")) {
      try { xhr.push(`${res.status()} ${u}: ${(await res.text()).slice(0, 200)}`); } catch {}
    }
  });

  await page.goto("https://www.americangrapplingfederation.com/tournaments", {
    waitUntil: "networkidle", timeout: 30000,
  });

  if (xhr.length) { console.log("XHR calls:"); xhr.forEach(x => console.log(" ", x)); }

  // Print structure of first few tournament cards
  const data = await page.evaluate(() => {
    const cards: unknown[] = [];
    // try multiple selector patterns
    const selectors = [
      ".tournament-card", ".event-card", "[class*='tournament']",
      "article", ".card", "tr[class*='event']", ".list-item",
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        els.forEach((el, i) => {
          if (i < 3) {
            cards.push({ selector: sel, html: el.outerHTML.slice(0, 600) });
          }
        });
        break;
      }
    }
    // Also try to find any data attributes or JSON in page
    const scripts = Array.from(document.querySelectorAll("script:not([src])"))
      .map(s => s.textContent?.slice(0, 300))
      .filter(s => s && (s.includes("tournament") || s.includes("event") || s.includes("date")))
      .slice(0, 2);
    return { cards, scripts };
  });
  console.log("Cards found:", JSON.stringify(data, null, 2).slice(0, 3000));
  await browser.close();
}

// ── NAGA: try WP REST API directly ─────────────────────────────────────────
async function inspectNAGA() {
  console.log("\n====== NAGA WP REST API TEST ======");
  const endpoints = [
    "https://www.nagafighter.com/wp-json/tribe/events/v1/events?per_page=10&status=publish",
    "https://www.nagafighter.com/wp-json/wp/v2/tribe_events?per_page=10",
    "https://www.nagafighter.com/wp-json/tribe/events/v1/events",
    "https://www.nagafighter.com/events/?tribe_event_display=list&ical=1",
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      const text = await res.text();
      console.log(`\n${res.status} ${url}`);
      console.log(text.slice(0, 400));
    } catch (e) {
      console.log(`\nERROR ${url}: ${e}`);
    }
  }
}

// ── ADCC: find the actual events section ────────────────────────────────────
async function inspectADCC() {
  console.log("\n====== ADCC SITE EXPLORATION ======");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });

  const apiCalls: string[] = [];
  page.on("response", async (res) => {
    const u = res.url();
    const ct = res.headers()["content-type"] ?? "";
    if (ct.includes("json") && !u.includes("shopify") && !u.includes("google") && !u.includes("shop.app")) {
      try { apiCalls.push(`${res.status()} ${u}\n   ${(await res.text()).slice(0, 300)}`); } catch {}
    }
  });

  await page.goto("https://adcc-official.com/", { waitUntil: "networkidle", timeout: 30000 });

  // Get all navigation links
  const links = await page.$$eval("a", els =>
    [...new Set(els.map(a => a.href))]
      .filter(h => h.includes("adcc-official.com") && !h.includes("#") && !h.endsWith("/"))
      .slice(0, 30)
  );
  console.log("All site links:", links);

  // Navigate to events/schedule pages
  const eventLinks = links.filter(l => /event|schedule|results|tournament|competition|bracket/i.test(l));
  console.log("\nEvent-related links:", eventLinks);

  for (const link of eventLinks.slice(0, 3)) {
    try {
      await page.goto(link, { waitUntil: "networkidle", timeout: 20000 });
      const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log(`\n${link}:\n${text}`);
    } catch (e) {
      console.log(`Failed: ${link}: ${e}`);
    }
  }

  if (apiCalls.length) { console.log("\nAPI calls:"); apiCalls.forEach(a => console.log(a)); }
  await browser.close();
}

async function main() {
  await inspectAGF();
  await inspectNAGA();
  await inspectADCC();
}
main().catch(console.error);
