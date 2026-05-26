import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/access-tokens";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(["read:keys", "read:metadata"])).min(1),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await db.accessToken.findMany({
    where: { userId: session.user.id, revokedAt: null },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tokens);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, scopes, expiresAt } = parsed.data;
  const { raw, prefix, hash } = generateToken();

  await db.accessToken.create({
    data: {
      name,
      tokenHash: hash,
      prefix,
      scopes: scopes.join(","),
      userId: session.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  // Return the raw token ONCE — never stored again
  return NextResponse.json({ token: raw, prefix, scopes, name }, { status: 201 });
}
