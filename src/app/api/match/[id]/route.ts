import { NextRequest, NextResponse } from "next/server";
import { getMatch } from "@/lib/riot-api";
import { isValidRegion } from "@/lib/types";
import { riotErrorResponse } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const region = request.nextUrl.searchParams.get("region");

  if (!id || !isValidRegion(region)) {
    return NextResponse.json(
      { error: "id y una región válida son requeridos" },
      { status: 400 }
    );
  }

  try {
    const match = await getMatch(id, region);
    return NextResponse.json(match);
  } catch (error) {
    return riotErrorResponse(error);
  }
}
