import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";
import { notifyKeyRemoved } from "@/lib/notifications";

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

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateKeySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    // Capture before-state for the diff
    const before = await db.apiKey.findUnique({
      where: { id },
      select: { name: true, provider: true, expiresAt: true, tags: true, notes: true },
    });

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

    // Build a diff of what changed
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (before) {
      if (rest.name && rest.name !== before.name) changes.name = { from: before.name, to: rest.name };
      if (rest.provider && rest.provider !== before.provider) changes.provider = { from: before.provider, to: rest.provider };
      if (rest.notes !== undefined && rest.notes !== before.notes) changes.notes = { from: before.notes, to: rest.notes };
      if (expiresAt !== undefined) changes.expiresAt = { from: before.expiresAt?.toISOString() ?? null, to: expiresAt };
      if (tags !== undefined) changes.tags = { from: JSON.parse(before.tags), to: tags };
      if (value) changes.value = { from: "***", to: "*** (rotated)" };
    }

    await writeAuditLog({
      action: "updated",
      entityType: "api_key",
      entityId: id,
      entityName: key.name,
      provider: key.provider,
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      details: Object.keys(changes).length > 0 ? changes : undefined,
    });

    return NextResponse.json(key);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Read before deleting so we can log and notify
  const key = await db.apiKey.findUnique({
    where: { id },
    select: { name: true, provider: true },
  });

  await db.apiKey.delete({ where: { id } });

  if (key) {
    const actor = session.user.name ?? session.user.email;
    await Promise.all([
      writeAuditLog({
        action: "deleted",
        entityType: "api_key",
        entityId: id,
        entityName: key.name,
        provider: key.provider,
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name,
      }),
      notifyKeyRemoved(key.name, key.provider, actor).catch(() => {}),
    ]);
  }

  return NextResponse.json({ success: true });
}
