import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "SUB_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await db.slackLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}
