import { db } from "./db";
import { runCheck } from "./monitor";
import { notifyKeyExpiry } from "./notifications";

let started = false;
let lastExpiryCheck = 0;

export function startScheduler() {
  if (started) return;
  started = true;

  setInterval(async () => {
    try {
      // Monitor checks: run any that are due
      const configs = await db.monitorConfig.findMany({
        where: { enabled: true },
        select: { apiKeyId: true, intervalMinutes: true, lastCheckedAt: true },
      });

      const now = new Date();
      for (const config of configs) {
        const due =
          !config.lastCheckedAt ||
          now.getTime() - config.lastCheckedAt.getTime() >= config.intervalMinutes * 60 * 1000;
        if (due) runCheck(config.apiKeyId).catch(console.error);
      }

      // Expiry checks: once per hour
      if (now.getTime() - lastExpiryCheck >= 60 * 60 * 1000) {
        lastExpiryCheck = now.getTime();
        await checkExpiryNotifications(now);
      }
    } catch (err) {
      console.error("[scheduler] error:", err);
    }
  }, 60_000);
}

export async function checkExpiryNotifications(now: Date = new Date()) {
  const notifySetting = await db.appSetting.findUnique({ where: { key: "notify_on_expiry" } });
  if (notifySetting?.value === "false") return;

  const daysSetting = await db.appSetting.findUnique({ where: { key: "expiry_warning_days" } });
  const warningDays = Number(daysSetting?.value ?? 14);

  const cutoff = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);

  const expiringKeys = await db.apiKey.findMany({
    where: {
      expiresAt: { gte: now, lte: cutoff },
    },
    select: { name: true, provider: true, expiresAt: true },
  });

  for (const key of expiringKeys) {
    if (!key.expiresAt) continue;
    const daysLeft = Math.ceil((key.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    notifyKeyExpiry(key.name, key.provider, daysLeft).catch(console.error);
  }
}
