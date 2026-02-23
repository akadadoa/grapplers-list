// Quick test to find working headers for ibjjf.com/api/v1/events/upcomings.json
const url = "https://ibjjf.com/api/v1/events/upcomings.json";

async function tryFetch(label: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    console.log(`[${label}] ${res.status} — ${text.slice(0, 120)}`);
  } catch (e) {
    console.log(`[${label}] ERROR: ${e}`);
  }
}

async function main() {
  await tryFetch("bare", {});
  await tryFetch("accept-json", { Accept: "application/json" });
  await tryFetch("accept-wildcard", { Accept: "*/*" });
  await tryFetch("full-browser", {
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://ibjjf.com/events/championships",
    "X-Requested-With": "XMLHttpRequest",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  });
  await tryFetch("xhr-only", {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    Referer: "https://ibjjf.com/events/championships",
  });
}

main().catch(console.error);
