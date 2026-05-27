import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createBackup, getBackupDir } from "@/lib/backup";
import { z } from "zod";

// POST — create a new backup immediately
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const backup = await createBackup(session.user.id);
  return NextResponse.json(backup, { status: 201 });
}

// GET — list backups or download one (?id=...)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const backup = await db.backup.findUnique({ where: { id } });
    if (!backup) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const content = await readFile(join(getBackupDir(), backup.filename), "utf8").catch(() => null);
    if (!content) return NextResponse.json({ error: "Backup file missing from disk" }, { status: 404 });

    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${backup.filename}"`,
      },
    });
  }

  const SETTING_KEYS = [
    "backup_max_count", "backup_schedule",
    "backup_schedule_hour", "backup_last_ran",
  ];

  const [backups, settingRows] = await Promise.all([
    db.backup.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    db.appSetting.findMany({ where: { key: { in: SETTING_KEYS } } }),
  ]);

  const s: Record<string, string> = {};
  for (const r of settingRows) s[r.key] = r.value;

  return NextResponse.json({
    backups,
    maxCount: Number(s["backup_max_count"] ?? 10),
    schedule: s["backup_schedule"] ?? "disabled",
    scheduleHour: Number(s["backup_schedule_hour"] ?? 2),
    lastRan: s["backup_last_ran"] ?? null,
  });
}

// DELETE — remove a backup by id
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const backup = await db.backup.findUnique({ where: { id } });
  if (!backup) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { unlink } = await import("fs/promises");
  const { join } = await import("path");
  await unlink(join(getBackupDir(), backup.filename)).catch(() => {});
  await db.backup.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// PATCH — update retention count and/or schedule
const patchSchema = z.object({
  maxCount: z.number().int().min(1).max(100).optional(),
  schedule: z.enum(["disabled", "daily", "weekly", "monthly"]).optional(),
  scheduleHour: z.number().int().min(0).max(23).optional(),
});

function upsert(key: string, value: string) {
  return db.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const ops: Promise<unknown>[] = [];
  const { maxCount, schedule, scheduleHour } = parsed.data;
  if (maxCount !== undefined) ops.push(upsert("backup_max_count", String(maxCount)));
  if (schedule !== undefined) ops.push(upsert("backup_schedule", schedule));
  if (scheduleHour !== undefined) ops.push(upsert("backup_schedule_hour", String(scheduleHour)));

  await Promise.all(ops);
  return NextResponse.json({ success: true });
}
