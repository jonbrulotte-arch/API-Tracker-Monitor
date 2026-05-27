import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? undefined;
  const keyId = searchParams.get("keyId") ?? undefined;

  const logs = await db.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(keyId ? { entityId: keyId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(logs);
}
