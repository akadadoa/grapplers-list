/**
 * Fetch the real API responses and print full structure
 */
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  });
  const page = await context.newPage();

  // ── IBJJF ────────────────────────────────────────────────
  console.log("\n====== IBJJF /api/v1/events/upcomings.json ======");
  const ibjjfCapture = new Promise<string>((resolve) => {
    page.on("response", async (res) => {
      if (res.url().includes("upcomings.json")) {
        resolve(await res.text());
      }
    });
  });
  await page.goto("https://ibjjf.com/events/championships", { waitUntil: "networkidle", timeout: 30000 });
  const ibjjfJson = await ibjjfCapture;
  const ibjjfData = JSON.parse(ibjjfJson);
  console.log("Top-level keys:", Object.keys(ibjjfData));
  if (ibjjfData.championships?.length) {
    console.log("championships[0]:", JSON.stringify(ibjjfData.championships[0], null, 2));
    console.log(`Total championships: ${ibjjfData.championships.length}`);
  }

  // ── JJWL ─────────────────────────────────────────────────
  console.log("\n====== JJWL /ajax/new_load_events.php ======");
  const jjwlCaptures: string[] = [];
  page.on("response", async (res) => {
    if (res.url().includes("new_load_events.php")) {
      jjwlCaptures.push(await res.text());
    }
  });
  await page.goto("https://www.jjworldleague.com", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  if (jjwlCaptures.length) {
    for (let i = 0; i < jjwlCaptures.length; i++) {
      const data = JSON.parse(jjwlCaptures[i]);
      console.log(`\nResponse #${i + 1} — ${data.length} events`);
      if (data[0]) console.log("events[0]:", JSON.stringify(data[0], null, 2));
    }
  }

  await browser.close();
}

main().catch(console.error);
