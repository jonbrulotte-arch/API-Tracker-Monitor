import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface Alert {
  id: string;           // keyId
  type: "expired" | "expiring" | "monitor_fail";
  keyName: string;
  provider: string;
  daysLeft?: number;    // for expiring
  expiresAt?: string;   // for expiring / expired
  errorMessage?: string; // for monitor_fail
  failingSince?: string; // for monitor_fail
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  // Pull expiry warning window from settings (default 14 days)
  const daysSetting = await db.appSetting.findUnique({ where: { key: "expiry_warning_days" } });
  const warningDays = Number(daysSetting?.value ?? 14);
  const cutoff = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);

  // Keys that are expired or expiring within the warning window
  const expiringKeys = await db.apiKey.findMany({
    where: { expiresAt: { lte: cutoff } },
    select: { id: true, name: true, provider: true, expiresAt: true },
    orderBy: { expiresAt: "asc" },
  });

  // Keys whose most recent monitor result is a failure
  // Fetch the latest result per key using a raw query approach via grouped results
  const failingMonitors = await db.monitorResult.findMany({
    where: { ok: false },
    orderBy: { checkedAt: "desc" },
    distinct: ["apiKeyId"],
    select: {
      apiKeyId: true,
      checkedAt: true,
      errorMessage: true,
      apiKey: { select: { id: true, name: true, provider: true } },
    },
  });

  // Filter out keys whose latest check (regardless of ok/fail) is actually ok
  // (i.e., only keep keys where the very latest result is a failure)
  const latestByKey = await db.monitorResult.findMany({
    orderBy: { checkedAt: "desc" },
    distinct: ["apiKeyId"],
    select: { apiKeyId: true, ok: true },
  });
  const latestOkSet = new Set(
    latestByKey.filter((r) => r.ok).map((r) => r.apiKeyId)
  );

  const alerts: Alert[] = [];

  for (const key of expiringKeys) {
    if (!key.expiresAt) continue;
    const daysLeft = Math.ceil((key.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: key.id,
      type: daysLeft <= 0 ? "expired" : "expiring",
      keyName: key.name,
      provider: key.provider,
      daysLeft: Math.max(0, daysLeft),
      expiresAt: key.expiresAt.toISOString(),
    });
  }

  for (const result of failingMonitors) {
    // Skip if the most recent check for this key is actually passing
    if (latestOkSet.has(result.apiKeyId)) continue;
    alerts.push({
      id: result.apiKeyId,
      type: "monitor_fail",
      keyName: result.apiKey.name,
      provider: result.apiKey.provider,
      errorMessage: result.errorMessage ?? undefined,
      failingSince: result.checkedAt.toISOString(),
    });
  }

  // Sort: expired first, then expiring (soonest first), then monitor failures
  alerts.sort((a, b) => {
    const order = { expired: 0, expiring: 1, monitor_fail: 2 };
    if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
    if (a.daysLeft !== undefined && b.daysLeft !== undefined) return a.daysLeft - b.daysLeft;
    return 0;
  });

  return NextResponse.json(alerts);
}
