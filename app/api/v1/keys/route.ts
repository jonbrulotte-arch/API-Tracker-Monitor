import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/access-tokens";
import { decrypt, maskKey } from "@/lib/crypto";
import { logApiCall, getClientIp } from "@/lib/api-logger";

export async function GET(req: NextRequest) {
  const start = Date.now();
  const path = "/api/v1/keys";
  const method = "GET";
  const ip = getClientIp(req);

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    await logApiCall({ method, path, statusCode: 401, responseMs: Date.now() - start, ipAddress: ip });
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const tokenResult = await verifyToken(authHeader.slice(7));
  if (!tokenResult) {
    await logApiCall({ method, path, statusCode: 401, responseMs: Date.now() - start, ipAddress: ip });
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const reveal = searchParams.get("reveal") === "true";
  const providerFilter = searchParams.get("provider")?.toLowerCase();
  const tagFilter = searchParams.get("tag")?.toLowerCase();

  if (reveal && !tokenResult.scopes.includes("read:keys")) {
    await logApiCall({ method, path, tokenPrefix: tokenResult.prefix, tokenName: tokenResult.name, statusCode: 403, responseMs: Date.now() - start, ipAddress: ip });
    return NextResponse.json({ error: "Token does not have read:keys scope" }, { status: 403 });
  }

  const keys = await db.apiKey.findMany({
    select: { id: true, name: true, provider: true, encryptedValue: true, expiresAt: true, tags: true, status: true, updatedAt: true },
    orderBy: { name: "asc" },
  });

  const filtered = keys.filter((k) => {
    if (providerFilter && k.provider.toLowerCase() !== providerFilter) return false;
    if (tagFilter) {
      let tags: string[] = [];
      try { tags = JSON.parse(k.tags); } catch { /* corrupted tag data */ }
      if (!tags.some((t) => t.toLowerCase() === tagFilter)) return false;
    }
    return true;
  });

  const result = filtered.map((k) => {
    let value: string | undefined;
    if (reveal) {
      try { value = decrypt(k.encryptedValue); } catch { value = undefined; }
    }
    let tags: string[] = [];
    try { tags = JSON.parse(k.tags); } catch { /* corrupted tag data */ }
    return {
      id: k.id, name: k.name, provider: k.provider,
      ...(reveal ? { value } : { valueMask: maskKey("placeholder") }),
      expiresAt: k.expiresAt, tags, status: k.status, updatedAt: k.updatedAt,
    };
  });

  await logApiCall({
    method, path,
    tokenPrefix: tokenResult.prefix,
    tokenName: tokenResult.name,
    statusCode: 200,
    responseMs: Date.now() - start,
    ipAddress: ip,
  });

  return NextResponse.json({ keys: result, count: result.length });
}
