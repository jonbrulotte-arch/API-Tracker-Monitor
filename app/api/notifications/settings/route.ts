import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  expiryWarningDays: z.number().int().min(1).max(90),
});

function upsert(key: string, value: string) {
  return db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const s = await db.appSetting.findUnique({ where: { key: "expiry_warning_days" } });
  return NextResponse.json({ expiryWarningDays: Number(s?.value ?? 14) });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await upsert("expiry_warning_days", String(parsed.data.expiryWarningDays));
  return NextResponse.json({ success: true });
}
