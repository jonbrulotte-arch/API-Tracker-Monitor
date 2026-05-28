import crypto from "crypto";
import { db } from "./db";

const TOKEN_PREFIX = "atm_";
const TOKEN_BYTES = 32;

export function generateToken(): { raw: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const raw = `${TOKEN_PREFIX}${random}`;
  const prefix = raw.slice(0, TOKEN_PREFIX.length + 8); // "atm_XXXXXXXX"
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, hash };
}

export async function verifyToken(raw: string): Promise<{
  userId: string;
  scopes: string[];
  tokenId: string;
  prefix: string;
  name: string;
} | null> {
  if (!raw.startsWith(TOKEN_PREFIX)) return null;

  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  const token = await db.accessToken.findUnique({
    where: { tokenHash: hash },
    select: {
      id: true, userId: true, scopes: true, revokedAt: true, expiresAt: true, prefix: true, name: true,
      user: { select: { status: true } },
    },
  });

  if (!token) return null;
  if (token.revokedAt) return null;
  if (token.expiresAt && token.expiresAt < new Date()) return null;
  if (token.user.status !== "ACTIVE") return null;

  // Update last used (fire-and-forget)
  db.accessToken.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    userId: token.userId,
    scopes: token.scopes.split(",").map((s) => s.trim()),
    tokenId: token.id,
    prefix: token.prefix,
    name: token.name,
  };
}
