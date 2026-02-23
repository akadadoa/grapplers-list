import { NextRequest, NextResponse } from "next/server";
import { runAllScrapers } from "@/lib/scrapers";

export const maxDuration = 300; // 5 minutes for scraping

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  // Also allow ?secret= query param
  const querySecret = new URL(request.url).searchParams.get("secret");
  if (querySecret === secret) return true;

  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runAllScrapers();
    const totalCount = results.reduce((sum, r) => sum + r.count, 0);
    return NextResponse.json({ success: true, results, totalCount });
  } catch (error) {
    console.error("[API] /scrape error:", error);
    return NextResponse.json(
      { error: "Scrape failed", details: String(error) },
      { status: 500 }
    );
  }
}
