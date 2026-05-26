import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const monitorSchema = z.object({
  endpoint: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).default("GET"),
  injectionType: z.enum(["header", "query", "body", "custom"]).default("header"),
  injectionKey: z.string().min(1),
  injectionFormat: z.string().optional().nullable(),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  intervalMinutes: z.number().int().min(1).max(1440).default(15),
  enabled: z.boolean().default(true),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = monitorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const config = await db.monitorConfig.upsert({
    where: { apiKeyId: id },
    create: { apiKeyId: id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json(config);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.monitorConfig.delete({ where: { apiKeyId: id } });
  return NextResponse.json({ success: true });
}
