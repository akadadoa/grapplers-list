import { chromium } from "playwright";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const ADCC_PAGES = [
  "https://adcc-official.com/pages/trials",
  "https://adcc-official.com/pages/adcc-world-championships",
  "https://adcc-official.com/pages/adcc-open-united-states",
  "https://adcc-official.com/pages/adcc-open-latin-america",
  "https://adcc-official.com/pages/adcc-open-canada",
  "https://adcc-official.com/pages/adcc-open-mexico",
  "https://adcc-official.com/pages/adcc-youth",
  "https://adcc-official.com/pages/trials-2026",
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });

  for (const url of ADCC_PAGES) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 800));
      const h1 = await page.$eval("h1, h2", el => el.textContent?.trim()).catch(() => "");
      console.log(`\n--- ${url} ---`);
      console.log(`H1: ${h1}`);
      console.log(text);
    } catch (e) {
      console.log(`\n--- ${url} --- ERROR: ${e}`);
    }
  }
  await browser.close();
}
main().catch(console.error);
