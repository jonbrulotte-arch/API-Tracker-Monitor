import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const key = await db.apiKey.findUnique({ where: { id }, select: { encryptedValue: true } });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const value = decrypt(key.encryptedValue);
    return NextResponse.json({ value });
  } catch {
    return NextResponse.json({ error: "Failed to decrypt" }, { status: 500 });
  }
}
