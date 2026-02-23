import { chromium } from "playwright";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function main() {
  // Try ADCC sitemap
  try {
    const res = await fetch("https://adcc-official.com/sitemap.xml", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    const pages = text.match(/<loc>(.*?)<\/loc>/g)?.map(m => m.replace(/<\/?loc>/g, "")) ?? [];
    console.log("Sitemap pages:", pages.slice(0, 30));
  } catch (e) { console.log("Sitemap error:", e); }

  // Playwright to get nav links
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.goto("https://adcc-official.com/", { waitUntil: "domcontentloaded", timeout: 20000 });
    const navLinks = await page.$$eval("a", els =>
      [...new Set(els.map(a => ({ text: a.textContent?.trim(), href: a.href })))]
        .filter(l => l.href.includes("adcc-official.com"))
        .slice(0, 40)
    );
    console.log("\nNav links:", JSON.stringify(navLinks, null, 2));
  } catch (e) { console.log("Playwright error:", e); }
  await browser.close();

  // Also check the NAGA event article HTML more carefully
  const browser2 = await chromium.launch({ headless: true });
  const page2 = await browser2.newPage({ userAgent: UA });
  try {
    await page2.goto("https://www.nagafighter.com/events/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page2.waitForTimeout(3000);
    const data = await page2.evaluate(() => {
      const articles = document.querySelectorAll(".tribe-events-calendar-list__event");
      return Array.from(articles).slice(0, 3).map(art => {
        const title = art.querySelector(".tribe-events-calendar-list__event-title a")?.textContent?.trim() ?? "";
        const href = (art.querySelector(".tribe-events-calendar-list__event-title a") as HTMLAnchorElement)?.href ?? "";
        const date = art.querySelector(".tribe-event-date-start, [class*='datetime'], time")?.textContent?.trim() ?? "";
        const venue = art.querySelector("[class*='venue'], [class*='location']")?.textContent?.trim() ?? "";
        const fullText = art.textContent?.replace(/\s+/g, " ").trim().slice(0, 400) ?? "";
        return { title, href, date, venue, fullText };
      });
    });
    console.log("\nNAGA events:", JSON.stringify(data, null, 2));

    // Also check pagination
    const nextPage = await page2.$eval(".tribe-events-c-nav__next-link, .tribe-events__nav-next a", el => (el as HTMLAnchorElement).href).catch(() => null);
    console.log("NAGA next page URL:", nextPage);
    const total = await page2.$eval(".tribe-events-header__title-text, .tribe-events-header-title", el => el.textContent).catch(() => null);
    console.log("NAGA page header:", total);
  } catch (e) { console.log("NAGA error:", e); }
  await browser2.close();
}
main().catch(console.error);
