import { decrypt } from "./crypto";
import { db } from "./db";
import { notifyMonitorFailure } from "./notifications";

export interface CheckResult {
  ok: boolean;
  statusCode?: number;
  responseMs?: number;
  errorMessage?: string;
}

export async function runCheck(apiKeyId: string): Promise<CheckResult> {
  const apiKey = await db.apiKey.findUnique({
    where: { id: apiKeyId },
    include: { monitorConfig: true },
  });

  if (!apiKey?.monitorConfig) {
    return { ok: false, errorMessage: "No monitor config found" };
  }

  const config = apiKey.monitorConfig;
  let plainKey: string;

  try {
    plainKey = decrypt(apiKey.encryptedValue);
  } catch {
    return { ok: false, errorMessage: "Failed to decrypt key" };
  }

  const headers: Record<string, string> = {
    "User-Agent": "API-Tracker-Monitor/1.0",
  };
  let url = config.endpoint;
  let body: string | undefined;

  switch (config.injectionType) {
    case "header": {
      const format = config.injectionFormat || "{key}";
      headers[config.injectionKey] = format.replace("{key}", plainKey);
      break;
    }
    case "query": {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}${encodeURIComponent(config.injectionKey)}=${encodeURIComponent(plainKey)}`;
      break;
    }
    case "body": {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({ [config.injectionKey]: plainKey });
      break;
    }
    case "custom": {
      // injectionFormat is the full header value template, injectionKey is the header name
      if (config.injectionFormat && config.injectionKey) {
        headers[config.injectionKey] = config.injectionFormat.replace("{key}", plainKey);
      }
      break;
    }
  }

  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: config.method,
      headers,
      body: ["POST", "PUT", "PATCH"].includes(config.method) ? body : undefined,
      signal: AbortSignal.timeout(15000),
    });

    const responseMs = Date.now() - start;
    const ok = response.status === config.expectedStatus;
    const errorMsg = ok ? null : `Expected ${config.expectedStatus}, got ${response.status}`;

    await db.monitorResult.create({
      data: { apiKeyId, ok, statusCode: response.status, responseMs, errorMessage: errorMsg },
    });

    await db.monitorConfig.update({
      where: { apiKeyId },
      data: { lastCheckedAt: new Date() },
    });

    // Notify on failure (fire-and-forget)
    if (!ok) {
      const notifySetting = await db.appSetting.findUnique({ where: { key: "notify_on_failure" } });
      if (notifySetting?.value !== "false") {
        notifyMonitorFailure(apiKey.name, apiKey.provider, errorMsg!, response.status).catch(console.error);
      }
    }

    return { ok, statusCode: response.status, responseMs };
  } catch (err) {
    const responseMs = Date.now() - start;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    await db.monitorResult.create({
      data: { apiKeyId, ok: false, responseMs, errorMessage },
    });

    await db.monitorConfig.update({
      where: { apiKeyId },
      data: { lastCheckedAt: new Date() },
    });

    const notifySetting = await db.appSetting.findUnique({ where: { key: "notify_on_failure" } });
    if (notifySetting?.value !== "false") {
      notifyMonitorFailure(apiKey.name, apiKey.provider, errorMessage).catch(console.error);
    }

    return { ok: false, responseMs, errorMessage };
  }
}

export async function getUptimeStats(apiKeyId: string, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const results = await db.monitorResult.findMany({
    where: { apiKeyId, checkedAt: { gte: since } },
    orderBy: { checkedAt: "asc" },
  });

  if (results.length === 0) return { uptime: null, totalChecks: 0, failedChecks: 0 };

  const failed = results.filter((r) => !r.ok).length;
  const uptime = ((results.length - failed) / results.length) * 100;

  return {
    uptime: Math.round(uptime * 10) / 10,
    totalChecks: results.length,
    failedChecks: failed,
    avgResponseMs:
      results.filter((r) => r.responseMs).reduce((sum, r) => sum + (r.responseMs ?? 0), 0) /
      results.filter((r) => r.responseMs).length,
    results,
  };
}
