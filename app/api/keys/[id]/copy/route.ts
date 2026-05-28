import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const key = await db.apiKey.findUnique({
    where: { id },
    select: { name: true, provider: true },
  });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  writeAuditLog({
    action: "copied",
    entityType: "api_key",
    entityId: id,
    entityName: key.name,
    provider: key.provider,
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
