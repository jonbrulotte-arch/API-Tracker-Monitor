import { db } from "./db";
import { encrypt } from "./crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join } from "path";

const BACKUP_DIR = join(process.cwd(), "data", "backups");

async function getMaxBackups(): Promise<number> {
  const s = await db.appSetting.findUnique({ where: { key: "backup_max_count" } });
  return Number(s?.value ?? 10);
}

async function collectData() {
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
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
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

export async function createBackup(createdById: string) {
  const data = await collectData();
  const encryptedPayload = encrypt(JSON.stringify(data, null, 2));

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.enc`;
  await mkdir(BACKUP_DIR, { recursive: true });
  await writeFile(join(BACKUP_DIR, filename), encryptedPayload, "utf8");

  const sizeBytes = Buffer.byteLength(encryptedPayload, "utf8");
  const backup = await db.backup.create({
    data: { filename, sizeBytes, encrypted: true, createdById },
  });

  // Prune beyond retention limit
  const maxCount = await getMaxBackups();
  const all = await db.backup.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, filename: true },
  });

  if (all.length > maxCount) {
    for (const old of all.slice(maxCount)) {
      await unlink(join(BACKUP_DIR, old.filename)).catch(() => {});
      await db.backup.delete({ where: { id: old.id } }).catch(() => {});
    }
  }

  return backup;
}

export function getBackupDir() {
  return BACKUP_DIR;
}

// Determine whether a scheduled backup is due right now
export function isScheduledBackupDue(
  schedule: string,
  scheduledHour: number,
  lastRan: Date | null,
  now: Date
): boolean {
  if (schedule === "disabled") return false;
  if (now.getUTCHours() !== scheduledHour) return false;
  if (!lastRan) return true; // never ran

  const elapsed = now.getTime() - lastRan.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  switch (schedule) {
    case "daily":
      return elapsed >= oneDay;
    case "weekly":
      // Run on Sunday
      return elapsed >= 7 * oneDay && now.getUTCDay() === 0;
    case "monthly":
      // Run on the 1st
      return elapsed >= 28 * oneDay && now.getUTCDate() === 1;
    default:
      return false;
  }
}
