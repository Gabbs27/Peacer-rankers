import { NextRequest, NextResponse } from "next/server";
import { getMatch } from "@/lib/riot-api";
import { Region } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const region = request.nextUrl.searchParams.get("region") as Region;

  if (!region) {
    return NextResponse.json(
      { error: "region is required" },
      { status: 400 }
    );
  }

  try {
    const match = await getMatch(id, region);
    return NextResponse.json(match);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
