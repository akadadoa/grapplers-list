import { chromium } from "playwright";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── AGF: get actual tournament card HTML ────────────────────────────────────
async function inspectAGF() {
  console.log("\n====== AGF: FULL TOURNAMENT HTML ======");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });
  await page.goto("https://www.americangrapplingfederation.com/tournaments", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    // Find ALL tournament rows/cards — try every reasonable pattern
    const patterns = [
      ".tournament-row", ".tournament-item", ".event-row", ".event-item",
      "tbody tr", ".table tr", "[data-filter]", ".filtr-item",
      ".col-md-4", ".col-lg-4", ".card",
    ];
    for (const sel of patterns) {
      const els = document.querySelectorAll(sel);
      if (els.length > 2) {
        const samples = Array.from(els).slice(0, 3).map(el => ({
          selector: sel,
          html: el.outerHTML.slice(0, 800),
        }));
        return { found: sel, count: els.length, samples };
      }
    }
    // Fallback: print full page body excerpt
    return {
      found: "body",
      count: 1,
      samples: [{ selector: "body", html: document.body.innerHTML.slice(0, 5000) }],
    };
  });
  console.log(JSON.stringify(result, null, 2).slice(0, 6000));
  await browser.close();
}

// ── NAGA: Playwright full browser ───────────────────────────────────────────
async function inspectNAGA() {
  console.log("\n====== NAGA: PLAYWRIGHT RENDER ======");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: UA });
  const page = await context.newPage();

  const apiCalls: string[] = [];
  page.on("response", async (res) => {
    const u = res.url();
    const ct = res.headers()["content-type"] ?? "";
    if ((ct.includes("json") || u.includes("tribe") || u.includes("event") || u.includes("wp-json"))
        && !u.includes("google") && !u.includes("facebook") && !u.includes("pixel")) {
      try { apiCalls.push(`${res.status()} ${u}: ${(await res.text()).slice(0, 300)}`); } catch {}
    }
  });

  try {
    await page.goto("https://www.nagafighter.com/events/", {
      waitUntil: "domcontentloaded", timeout: 30000,
    });
    await page.waitForTimeout(5000);
  } catch (e) { console.log("Nav error:", e); }

  console.log("API calls:", apiCalls);

  const result = await page.evaluate(() => {
    const events: string[] = [];
    const patterns = [
      ".tribe-event", ".tribe-events-calendar-list__event",
      ".tribe-events-list-event", "article.type-tribe_events",
      ".type-tribe_events", "[class*='tribe-event']",
    ];
    for (const sel of patterns) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        Array.from(els).slice(0, 3).forEach(el => events.push(el.outerHTML.slice(0, 600)));
        return { selector: sel, count: els.length, samples: events };
      }
    }
    return { selector: "none", count: 0, bodyExcerpt: document.body.innerHTML.slice(0, 2000) };
  });
  console.log(JSON.stringify(result, null, 2).slice(0, 4000));
  await browser.close();
}

// ── ADCC: find events pages ──────────────────────────────────────────────────
async function inspectADCC() {
  console.log("\n====== ADCC: SITE PAGES ======");
  const urls = [
    "https://adcc-official.com/pages/events",
    "https://adcc-official.com/pages/schedule",
    "https://adcc-official.com/pages/results",
    "https://adcc-official.com/pages/tournaments",
    "https://adcc-official.com/collections/events",
    "https://adcc-official.com/blogs/news",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(10000),
      });
      const text = await res.text();
      const isHtml = text.includes("<!DOCTYPE");
      const preview = isHtml
        ? text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 300)
        : text.slice(0, 300);
      console.log(`\n${res.status} ${url}`);
      console.log(preview);
    } catch (e) {
      console.log(`ERROR ${url}: ${e}`);
    }
  }
}

async function main() {
  await inspectAGF();
  await inspectNAGA();
  await inspectADCC();
}
main().catch(console.error);
