import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.string().min(1).max(100),
  value: z.string().min(1),
  expiresAt: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await db.apiKey.findMany({
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      monitorConfig: true,
      monitorResults: {
        orderBy: { checkedAt: "desc" },
        take: 20,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, provider, value, expiresAt, tags, notes } = parsed.data;

  const key = await db.apiKey.create({
    data: {
      name,
      provider,
      encryptedValue: encrypt(value),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      tags: JSON.stringify(tags ?? []),
      notes,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      monitorConfig: true,
      monitorResults: { take: 0 },
    },
  });

  return NextResponse.json(key, { status: 201 });
}
