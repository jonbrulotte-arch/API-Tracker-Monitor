import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const [token, user] = await Promise.all([
    db.accessToken.findUnique({ where: { id }, select: { id: true } }),
    db.user.findUnique({ where: { id: userId }, select: { id: true, status: true } }),
  ]);
  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await db.accessToken.update({
    where: { id },
    data: { userId },
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true, status: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const token = await db.accessToken.findUnique({ where: { id }, select: { id: true } });
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.accessToken.update({ where: { id }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
