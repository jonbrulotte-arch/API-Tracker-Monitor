import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED", "PENDING"]).optional(),
  role: z.enum(["ADMIN", "SUB_ADMIN", "MEMBER"]).optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = session.user.role;
  if (callerRole !== "ADMIN" && callerRole !== "SUB_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true, email: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (callerRole === "SUB_ADMIN" && (target.role === "ADMIN" || target.role === "SUB_ADMIN")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { status, role, name, email } = parsed.data;

  if (role && (role === "SUB_ADMIN" || role === "ADMIN") && callerRole !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can promote users" }, { status: 403 });
  }

  if (id === session.user.id) {
    return NextResponse.json({ error: "Use the profile settings page to modify your own account" }, { status: 400 });
  }

  if (email && email !== target.email) {
    const conflict = await db.user.findUnique({ where: { email } });
    if (conflict) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
    },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
