import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/access-tokens";
import { decrypt, maskKey } from "@/lib/crypto";

/**
 * GET /api/v1/keys
 * List all keys (metadata only, no values) or include decrypted values with read:keys scope.
 *
 * Authorization: Bearer atm_<token>
 * ?reveal=true — include decrypted key values (requires read:keys scope)
 * ?provider=stripe — filter by provider (case-insensitive)
 * ?tag=production — filter by tag
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const tokenResult = await verifyToken(authHeader.slice(7));
  if (!tokenResult) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const reveal = searchParams.get("reveal") === "true";
  const providerFilter = searchParams.get("provider")?.toLowerCase();
  const tagFilter = searchParams.get("tag")?.toLowerCase();

  if (reveal && !tokenResult.scopes.includes("read:keys")) {
    return NextResponse.json({ error: "Token does not have read:keys scope" }, { status: 403 });
  }

  const keys = await db.apiKey.findMany({
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
    orderBy: { name: "asc" },
  });

  const filtered = keys.filter((k) => {
    if (providerFilter && k.provider.toLowerCase() !== providerFilter) return false;
    if (tagFilter) {
      const tags: string[] = JSON.parse(k.tags);
      if (!tags.some((t) => t.toLowerCase() === tagFilter)) return false;
    }
    return true;
  });

  const result = filtered.map((k) => {
    let value: string | undefined;
    if (reveal) {
      try { value = decrypt(k.encryptedValue); } catch { value = undefined; }
    }
    return {
      id: k.id,
      name: k.name,
      provider: k.provider,
      ...(reveal ? { value } : { valueMask: maskKey("placeholder") }),
      expiresAt: k.expiresAt,
      tags: JSON.parse(k.tags),
      status: k.status,
      updatedAt: k.updatedAt,
    };
  });

  return NextResponse.json({ keys: result, count: result.length });
}
