import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { z } from "zod";

const MAX_BACKUPS_DEFAULT = 10;

async function getMaxBackups(): Promise<number> {
  const s = await db.appSetting.findUnique({ where: { key: "backup_max_count" } });
  return Number(s?.value ?? MAX_BACKUPS_DEFAULT);
}

// Gather all data worth backing up
async function collectBackupData() {
  const [keys, settings, monitors, users] = await Promise.all([
    db.apiKey.findMany({
      select: {
        id: true, name: true, provider: true, encryptedValue: true,
        expiresAt: true, tags: true, notes: true, status: true,
        createdAt: true, updatedAt: true, createdById: true,
      },
    }),
    db.appSetting.findMany(),
    db.monitorConfig.findMany(),
    db.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        status: true, createdAt: true,
      },
    }),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    users,
    apiKeys: keys,
    monitorConfigs: monitors,
    appSettings: settings,
  };
}

// POST — create a new backup
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await collectBackupData();
  const json = JSON.stringify(data, null, 2);
  const encryptedPayload = encrypt(json);

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.enc`;

  // Store encrypted backup file on disk
  const { writeFile } = await import("fs/promises");
  const { join } = await import("path");
  const dir = join(process.cwd(), "data", "backups");
  const { mkdir } = await import("fs/promises");
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, filename);
  await writeFile(filePath, encryptedPayload, "utf8");

  const sizeBytes = Buffer.byteLength(encryptedPayload, "utf8");

  const backup = await db.backup.create({
    data: {
      filename,
      sizeBytes,
      encrypted: true,
      createdById: session.user.id,
    },
  });

  // Prune oldest backups beyond the limit
  const maxCount = await getMaxBackups();
  const all = await db.backup.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, filename: true },
  });

  if (all.length > maxCount) {
    const toDelete = all.slice(maxCount);
    const { unlink } = await import("fs/promises");
    for (const old of toDelete) {
      const oldPath = join(dir, old.filename);
      await unlink(oldPath).catch(() => {});
      await db.backup.delete({ where: { id: old.id } }).catch(() => {});
    }
  }

  return NextResponse.json(backup, { status: 201 });
}

// GET — list backups (no query param) or download a specific one (?id=...)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    // Download specific backup
    const backup = await db.backup.findUnique({ where: { id } });
    if (!backup) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const filePath = join(process.cwd(), "data", "backups", backup.filename);
    const content = await readFile(filePath, "utf8").catch(() => null);
    if (!content) return NextResponse.json({ error: "Backup file missing from disk" }, { status: 404 });

    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${backup.filename}"`,
      },
    });
  }

  // List all backups
  const backups = await db.backup.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  const maxCount = await getMaxBackups();

  return NextResponse.json({ backups, maxCount });
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
  await unlink(join(process.cwd(), "data", "backups", backup.filename)).catch(() => {});
  await db.backup.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// PATCH — update max backup count setting
const patchSchema = z.object({ maxCount: z.number().int().min(1).max(100) });

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  await db.appSetting.upsert({
    where: { key: "backup_max_count" },
    create: { key: "backup_max_count", value: String(parsed.data.maxCount) },
    update: { value: String(parsed.data.maxCount) },
  });

  return NextResponse.json({ success: true });
}
