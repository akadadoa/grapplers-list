/**
 * Discovery script — captures all XHR/fetch calls from IBJJF and JJWL
 * Run with: npx tsx scripts/discover.ts
 */
import { chromium } from "playwright";

async function discover(label: string, url: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[${label}] Navigating to: ${url}`);
  console.log("=".repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const apiCalls: Array<{ url: string; method: string; status: number; contentType: string; bodyPreview: string }> = [];

  page.on("response", async (response) => {
    const resUrl = response.url();
    const contentType = response.headers()["content-type"] ?? "";
    const status = response.status();

    // Only capture JSON or interesting responses
    if (
      contentType.includes("json") ||
      resUrl.includes("api") ||
      resUrl.includes("event") ||
      resUrl.includes("competition") ||
      resUrl.includes("schedule") ||
      resUrl.includes("hermes")
    ) {
      let bodyPreview = "";
      try {
        const text = await response.text();
        bodyPreview = text.slice(0, 300);
      } catch {
        bodyPreview = "[unreadable]";
      }
      apiCalls.push({ url: resUrl, method: response.request().method(), status, contentType, bodyPreview });
    }
  });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    // Wait a bit more for lazy loads
    await page.waitForTimeout(3000);
  } catch (err) {
    console.warn(`Navigation warning: ${err}`);
  }

  for (const call of apiCalls) {
    console.log(`\n  URL: ${call.url}`);
    console.log(`  ${call.method} ${call.status} | ${call.contentType}`);
    if (call.bodyPreview) {
      console.log(`  Body preview: ${call.bodyPreview.replace(/\n/g, " ")}`);
    }
  }

  if (apiCalls.length === 0) {
    console.log("  No API/JSON calls captured.");
    // Print all resource URLs to help find patterns
    console.log("\n  All requests made:");
    const requests = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((r) => ({
        name: r.name,
        type: (r as PerformanceResourceTiming).initiatorType,
      }))
    );
    for (const r of requests.filter(
      (r) => r.type === "xmlhttprequest" || r.type === "fetch" || r.name.includes("api")
    )) {
      console.log(`    [${r.type}] ${r.name}`);
    }
  }

  await browser.close();
}

async function main() {
  await discover("IBJJF", "https://ibjjf.com/events/championships");
  await discover("JJWL", "https://www.jjworldleague.com");
}

main().catch(console.error);
