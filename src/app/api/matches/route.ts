import { NextRequest, NextResponse } from "next/server";
import { getMatchIds, getMatches } from "@/lib/riot-api";
import { Region } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region") as Region;
  const count = parseInt(searchParams.get("count") || "10");

  if (!puuid || !region) {
    return NextResponse.json(
      { error: "puuid and region are required" },
      { status: 400 }
    );
  }

  try {
    const matchIds = await getMatchIds(puuid, region, count);
    const matches = await getMatches(matchIds, region);
    return NextResponse.json({ matches });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
