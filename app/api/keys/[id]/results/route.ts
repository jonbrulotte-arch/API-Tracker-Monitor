import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUptimeStats } from "@/lib/monitor";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const days = Number(req.nextUrl.searchParams.get("days") ?? 7);
  const stats = await getUptimeStats(id, Math.min(days, 90));
  return NextResponse.json(stats);
}
