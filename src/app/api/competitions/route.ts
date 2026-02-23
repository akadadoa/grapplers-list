import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const region = searchParams.get("region");
  const sourcesParam = searchParams.get("sources");

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

  try {
    const competitions = await prisma.competition.findMany({
      where,
      orderBy: { startDate: "asc" },
      take: 500,
    });

    return NextResponse.json(competitions);
  } catch (error) {
    console.error("[API] /competitions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch competitions" },
      { status: 500 }
    );
  }
}
