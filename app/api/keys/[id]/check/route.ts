import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runCheck } from "@/lib/monitor";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await runCheck(id);
  return NextResponse.json(result);
}
