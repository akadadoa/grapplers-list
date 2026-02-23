import { NextRequest, NextResponse } from "next/server";
import { scrapeIBJJF } from "@/lib/scrapers/ibjjf";

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await scrapeIBJJF();
    return NextResponse.json({ success: true, source: "ibjjf", ...result });
  } catch (error) {
    return NextResponse.json(
      { error: "IBJJF scrape failed", details: String(error) },
      { status: 500 }
    );
  }
}
