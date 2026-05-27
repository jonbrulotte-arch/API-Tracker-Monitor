import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channel = req.nextUrl.searchParams.get("channel"); // slack | email | teams | null (all)

  const logs = await db.notificationLog.findMany({
    where: channel ? { channel } : undefined,
    orderBy: { sentAt: "desc" },
    take: 200,
  });

  return NextResponse.json(logs);
}
