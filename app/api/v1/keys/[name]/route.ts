import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/access-tokens";
import { decrypt } from "@/lib/crypto";

/**
 * GET /api/v1/keys/:name
 * Fetch a single key by name and return its decrypted value.
 * Requires read:keys scope.
 *
 * Authorization: Bearer atm_<token>
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const tokenResult = await verifyToken(authHeader.slice(7));
  if (!tokenResult) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  if (!tokenResult.scopes.includes("read:keys")) {
    return NextResponse.json({ error: "Token does not have read:keys scope" }, { status: 403 });
  }

  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const key = await db.apiKey.findFirst({
    where: { name: decodedName },
    select: {
      id: true,
      name: true,
      provider: true,
      encryptedValue: true,
      expiresAt: true,
      tags: true,
      status: true,
      updatedAt: true,
    },
  });

  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  let value: string;
  try {
    value = decrypt(key.encryptedValue);
  } catch {
    return NextResponse.json({ error: "Failed to decrypt key" }, { status: 500 });
  }

  return NextResponse.json({
    id: key.id,
    name: key.name,
    provider: key.provider,
    value,
    expiresAt: key.expiresAt,
    tags: JSON.parse(key.tags),
    status: key.status,
    updatedAt: key.updatedAt,
  });
}
