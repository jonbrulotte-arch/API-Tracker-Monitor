import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
const monitorSchema = z.object({
  endpoint: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).default("GET"),
  injectionType: z.enum(["header", "query", "body", "custom"]).default("header"),
  injectionKey: z.string().min(1).max(200),
  injectionFormat: z.string().max(500).optional().nullable(),
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

  // Capture before-state, key metadata, and ownership for the audit diff
  const [existing, apiKey] = await Promise.all([
    db.monitorConfig.findUnique({ where: { apiKeyId: id } }),
    db.apiKey.findUnique({ where: { id }, select: { name: true, provider: true, createdById: true } }),
  ]);

  if (!apiKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPrivileged = session.user.role === "ADMIN" || session.user.role === "SUB_ADMIN";
  if (apiKey.createdById !== session.user.id && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isCreate = !existing;
  const config = await db.monitorConfig.upsert({
    where: { apiKeyId: id },
    create: { apiKeyId: id, ...parsed.data },
    update: parsed.data,
  });

  if (apiKey) {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (isCreate) {
      changes.monitor = { from: null, to: "configured" };
    } else {
      const fields = ["endpoint", "method", "injectionType", "injectionKey", "injectionFormat", "expectedStatus", "intervalMinutes", "enabled"] as const;
      for (const f of fields) {
        if (parsed.data[f] !== existing[f]) {
          changes[f] = { from: existing[f], to: parsed.data[f] };
        }
      }
    }

    writeAuditLog({
      action: isCreate ? "created" : "updated",
      entityType: "monitor",
      entityId: id,
      entityName: apiKey.name,
      provider: apiKey.provider,
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      details: Object.keys(changes).length > 0 ? changes : undefined,
    }).catch(() => {});
  }

  return NextResponse.json(config);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const apiKey = await db.apiKey.findUnique({
    where: { id },
    select: { name: true, provider: true, createdById: true },
  });

  if (!apiKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPrivileged = session.user.role === "ADMIN" || session.user.role === "SUB_ADMIN";
  if (apiKey.createdById !== session.user.id && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.monitorResult.deleteMany({ where: { apiKeyId: id } });
  await db.monitorConfig.delete({ where: { apiKeyId: id } });

  if (apiKey) {
    writeAuditLog({
      action: "deleted",
      entityType: "monitor",
      entityId: id,
      entityName: apiKey.name,
      provider: apiKey.provider,
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

