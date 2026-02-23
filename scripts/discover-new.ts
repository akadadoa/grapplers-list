import { chromium } from "playwright";

async function discover(label: string, url: string) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`[${label}] ${url}`);
  console.log("=".repeat(70));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const captured: Array<{
    url: string; method: string; status: number;
    contentType: string; postData: string; bodyPreview: string;
  }> = [];

  page.on("request", (req) => {
    const u = req.url();
    if (req.method() === "POST" || u.includes("api") || u.includes("event") ||
        u.includes("competition") || u.includes("tournament") || u.includes("schedule") ||
        u.includes("ajax") || u.includes(".json") || u.includes("graphql")) {
      captured.push({
        url: u, method: req.method(), status: 0,
        contentType: "", postData: req.postData() ?? "",
        bodyPreview: "",
      });
    }
  });

  page.on("response", async (res) => {
    const u = res.url();
    const ct = res.headers()["content-type"] ?? "";
    const status = res.status();
    if (ct.includes("json") || u.includes("api") || u.includes("event") ||
        u.includes("competition") || u.includes("tournament") || u.includes("schedule") ||
        u.includes("ajax") || u.includes(".json") || u.includes("graphql")) {
      let bodyPreview = "";
      try { bodyPreview = (await res.text()).slice(0, 400); } catch { bodyPreview = "[unreadable]"; }
      const existing = captured.find(c => c.url === u && c.bodyPreview === "");
      if (existing) {
        existing.status = status;
        existing.contentType = ct;
        existing.bodyPreview = bodyPreview;
      } else {
        captured.push({ url: u, method: res.request().method(), status, contentType: ct, postData: "", bodyPreview });
      }
    }
  });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(3000);

    // Try clicking on events/schedule links
    const eventLinks = await page.$$eval("a", (links) =>
      links
        .map(a => ({ href: a.href, text: a.textContent?.trim() ?? "" }))
        .filter(l => /event|schedule|tournament|competition|register/i.test(l.text + l.href))
        .slice(0, 3)
    );
    for (const link of eventLinks) {
      if (link.href && link.href.startsWith("http")) {
        try {
          await page.goto(link.href, { waitUntil: "networkidle", timeout: 20000 });
          await page.waitForTimeout(2000);
          console.log(`  Also navigated to: ${link.href}`);
        } catch { /* skip */ }
      }
    }
  } catch (err) {
    console.warn(`  Navigation warning: ${err}`);
  }

  const seen = new Set<string>();
  for (const c of captured) {
    const key = `${c.method}:${c.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!c.bodyPreview && !c.postData) continue;
    console.log(`\n  [${c.method}] ${c.status} ${c.url}`);
    if (c.postData) console.log(`  PostData: ${c.postData}`);
    if (c.contentType) console.log(`  Content-Type: ${c.contentType}`);
    if (c.bodyPreview) console.log(`  Body: ${c.bodyPreview.replace(/\n/g, " ")}`);
  }

  if (captured.filter(c => c.bodyPreview).length === 0) {
    console.log("\n  No JSON/API calls captured. Listing all page links:");
    const links = await page.$$eval("a", els =>
      els.map(a => `${a.textContent?.trim()} → ${a.href}`).filter(Boolean).slice(0, 20)
    );
    links.forEach(l => console.log("   ", l));
  }

  await browser.close();
}

async function main() {
  await discover("AGF", "https://www.americangrapplingfederation.com/");
  await discover("NAGA", "https://www.nagafighter.com/");
  await discover("ADCC", "https://adcc-official.com/");
}

main().catch(console.error);
