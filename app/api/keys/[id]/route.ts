import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

const updateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provider: z.string().min(1).max(100).optional(),
  value: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const key = await db.apiKey.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      monitorConfig: true,
      monitorResults: { orderBy: { checkedAt: "desc" }, take: 50 },
    },
  });

  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(key);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { value, expiresAt, tags, ...rest } = parsed.data;
  const key = await db.apiKey.update({
    where: { id },
    data: {
      ...rest,
      ...(value ? { encryptedValue: encrypt(value) } : {}),
      ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
      ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      monitorConfig: true,
      monitorResults: { orderBy: { checkedAt: "desc" }, take: 20 },
    },
  });

  return NextResponse.json(key);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.apiKey.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
