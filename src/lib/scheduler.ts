import cron from "node-cron";
import { runAllScrapers } from "@/lib/scrapers";

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  console.log("[Scheduler] Starting daily scrape scheduler (3AM UTC)");

  // Run at 3:00 AM UTC every day
  cron.schedule("0 3 * * *", async () => {
    console.log("[Scheduler] Running scheduled scrape...");
    try {
      const results = await runAllScrapers();
      const total = results.reduce((sum, r) => sum + r.count, 0);
      console.log(`[Scheduler] Scrape complete. ${total} competitions upserted.`, results);
    } catch (err) {
      console.error("[Scheduler] Scrape failed:", err);
    }
  });
}
