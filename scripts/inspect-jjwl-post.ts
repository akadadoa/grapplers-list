import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  });
  const page = await context.newPage();

  // Intercept requests to capture POST body
  page.on("request", (req) => {
    if (req.url().includes("new_load_events.php")) {
      console.log("\n--- POST Request ---");
      console.log("URL:", req.url());
      console.log("Method:", req.method());
      console.log("Headers:", JSON.stringify(req.headers(), null, 2));
      console.log("PostData:", req.postData());
    }
  });

  await page.goto("https://www.jjworldleague.com", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(console.error);
