import { db } from "./db";

interface ApiLogEntry {
  method: string;
  path: string;
  tokenPrefix?: string;
  tokenName?: string;
  statusCode: number;
  responseMs: number;
  keyName?: string;
  ipAddress?: string;
}

export async function logApiCall(entry: ApiLogEntry): Promise<void> {
  try {
    await db.apiLog.create({ data: entry });
  } catch {
    // logging must never break the API response
  }
}

export function getClientIp(req: Request): string | undefined {
  const xff = (req.headers as Headers).get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return undefined;
}
