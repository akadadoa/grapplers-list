import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const region = searchParams.get("region");
  const sourcesParam = searchParams.get("sources");
  const giParam = searchParams.get("gi");
  const nogiParam = searchParams.get("nogi");
  const adultParam = searchParams.get("adult");
  const kidsParam = searchParams.get("kids");

  // Build Prisma where filter
  const where: Prisma.CompetitionWhereInput = {};

  // Date filter
  if (dateFrom || dateTo) {
    where.startDate = {};
    if (dateFrom) {
      where.startDate = { ...(where.startDate as object), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      where.startDate = {
        ...(where.startDate as object),
        lte: new Date(dateTo + "T23:59:59Z"),
      };
    }
  } else {
    // Default: only future competitions
    where.startDate = { gte: new Date() };
  }

  // Source filter
  if (sourcesParam) {
    const sources = sourcesParam.split(",").map((s) => s.trim().toLowerCase());
    where.source = { in: sources };
  }

  // Region filter (text search on location)
  if (region && region.trim()) {
    where.location = {
      contains: region.trim(),
    };
  }

  // Gi / No-Gi filter
  const wantGi = giParam === "1";
  const wantNogi = nogiParam === "1";
  if (wantGi && !wantNogi) {
    where.gi = true;
  } else if (wantNogi && !wantGi) {
    where.nogi = true;
  } else if (!wantGi && !wantNogi) {
    // Neither selected → return nothing
    where.id = { in: [] };
  }
  // Both selected → no filter (show all)

  // Adult / Kids filter
  const wantAdult = adultParam === "1";
  const wantKids = kidsParam === "1";
  if (wantAdult && !wantKids) {
    where.kids = false;
  } else if (wantKids && !wantAdult) {
    where.kids = true;
  } else if (!wantAdult && !wantKids) {
    where.id = { in: [] };
  }
  // Both selected → no filter

  // Total count: source + gi/nogi/kids filters but NOT date/region,
  // so the badge shows "X in date range / Y matching your type filters"
  const totalWhere: Prisma.CompetitionWhereInput = {};
  if (sourcesParam) {
    totalWhere.source = { in: sourcesParam.split(",").map((s) => s.trim().toLowerCase()) };
  }
  if (wantGi && !wantNogi) {
    totalWhere.gi = true;
  } else if (wantNogi && !wantGi) {
    totalWhere.nogi = true;
  } else if (!wantGi && !wantNogi) {
    totalWhere.id = { in: [] };
  }
  if (wantAdult && !wantKids) {
    totalWhere.kids = false;
  } else if (wantKids && !wantAdult) {
    totalWhere.kids = true;
  } else if (!wantAdult && !wantKids) {
    totalWhere.id = { in: [] };
  }

  try {
    const [competitions, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        orderBy: { startDate: "asc" },
        take: 500,
      }),
      prisma.competition.count({ where: totalWhere }),
    ]);

    return NextResponse.json({ competitions, total });
  } catch (error) {
    console.error("[API] /competitions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch competitions" },
      { status: 500 }
    );
  }
}
