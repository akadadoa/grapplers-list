import { NextRequest, NextResponse } from "next/server";
import { scrapeNAGA } from "@/lib/scrapers/naga";

export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const querySecret = new URL(request.url).searchParams.get("secret");
  if (querySecret === secret) return true;
  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await scrapeNAGA();
    return NextResponse.json({ success: true, source: "naga", ...result });
  } catch (error) {
    return NextResponse.json({ error: "NAGA scrape failed", details: String(error) }, { status: 500 });
  }
}
