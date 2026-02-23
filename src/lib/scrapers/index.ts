import { scrapeIBJJF } from "./ibjjf";
import { scrapeJJWL } from "./jjwl";
import { scrapeAGF } from "./agf";
import { scrapeNAGA } from "./naga";
import { scrapeADCC } from "./adcc";

export interface ScrapeResult {
  source: string;
  count: number;
  method: string;
  error?: string;
}

export async function runAllScrapers(): Promise<ScrapeResult[]> {
  const tasks: Array<{ source: string; fn: () => Promise<{ count: number; method: string }> }> = [
    { source: "ibjjf", fn: scrapeIBJJF },
    { source: "jjwl", fn: scrapeJJWL },
    { source: "agf", fn: scrapeAGF },
    { source: "naga", fn: scrapeNAGA },
    { source: "adcc", fn: scrapeADCC },
  ];

  const results = await Promise.allSettled(tasks.map(t => t.fn()));

  return results.map((r, i) => {
    const source = tasks[i].source;
    if (r.status === "fulfilled") {
      return { source, ...r.value };
    }
    return {
      source,
      count: 0,
      method: "error",
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}
