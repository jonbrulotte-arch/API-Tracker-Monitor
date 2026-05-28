import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/access-tokens";
import { decrypt } from "@/lib/crypto";
import { logApiCall, getClientIp } from "@/lib/api-logger";

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const start = Date.now();
  const { name: rawName } = await params;
  const decodedName = decodeURIComponent(rawName);
  const path = `/api/v1/keys/${decodedName}`;
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

  if (!tokenResult.scopes.includes("read:keys")) {
    await logApiCall({ method, path, tokenPrefix: tokenResult.prefix, tokenName: tokenResult.name, statusCode: 403, responseMs: Date.now() - start, ipAddress: ip });
    return NextResponse.json({ error: "Token does not have read:keys scope" }, { status: 403 });
  }

  const key = await db.apiKey.findFirst({
    where: { name: decodedName },
    select: { id: true, name: true, provider: true, encryptedValue: true, expiresAt: true, tags: true, status: true, updatedAt: true },
  });

  if (!key) {
    await logApiCall({ method, path, tokenPrefix: tokenResult.prefix, tokenName: tokenResult.name, statusCode: 404, responseMs: Date.now() - start, ipAddress: ip });
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  let value: string;
  try {
    value = decrypt(key.encryptedValue);
  } catch {
    await logApiCall({ method, path, tokenPrefix: tokenResult.prefix, tokenName: tokenResult.name, statusCode: 500, keyName: key.name, responseMs: Date.now() - start, ipAddress: ip });
    return NextResponse.json({ error: "Failed to decrypt key" }, { status: 500 });
  }

  await logApiCall({
    method, path,
    tokenPrefix: tokenResult.prefix,
    tokenName: tokenResult.name,
    statusCode: 200,
    responseMs: Date.now() - start,
    keyName: key.name,
    ipAddress: ip,
  });

  return NextResponse.json({
    id: key.id, name: key.name, provider: key.provider, value,
    expiresAt: key.expiresAt, tags: JSON.parse(key.tags), status: key.status, updatedAt: key.updatedAt,
  });
}
