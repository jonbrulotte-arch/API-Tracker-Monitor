import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

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

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.string().min(1).max(100),
  value: z.string().min(1),
  expiresAt: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional().nullable(),
  monitor: monitorSchema.optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await db.apiKey.findMany({
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      monitorConfig: true,
      monitorResults: { orderBy: { checkedAt: "desc" }, take: 20 },
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

  const { name, provider, value, expiresAt, tags, notes, monitor } = parsed.data;

  const key = await db.apiKey.create({
    data: {
      name,
      provider,
      encryptedValue: encrypt(value),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      tags: JSON.stringify(tags ?? []),
      notes,
      createdById: session.user.id,
      ...(monitor
        ? {
            monitorConfig: {
              create: monitor,
            },
          }
        : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      monitorConfig: true,
      monitorResults: { take: 0 },
    },
  });

  return NextResponse.json(key, { status: 201 });
}
