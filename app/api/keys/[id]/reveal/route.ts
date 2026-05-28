import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(`reveal:${session.user.id}`, 20)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;
  const key = await db.apiKey.findUnique({
    where: { id },
    select: { name: true, provider: true, encryptedValue: true },
  });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const value = decrypt(key.encryptedValue);

    writeAuditLog({
      action: "revealed",
      entityType: "api_key",
      entityId: id,
      entityName: key.name,
      provider: key.provider,
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
    }).catch(() => {});

    return NextResponse.json({ value });
  } catch {
    return NextResponse.json({ error: "Failed to decrypt" }, { status: 500 });
  }
}
