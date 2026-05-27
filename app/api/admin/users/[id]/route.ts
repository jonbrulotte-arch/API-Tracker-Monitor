import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED", "PENDING"]).optional(),
  role: z.enum(["ADMIN", "SUB_ADMIN", "MEMBER"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = session.user.role;
  if (callerRole !== "ADMIN" && callerRole !== "SUB_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Sub-admins can only modify MEMBERs, not other admins
  if (callerRole === "SUB_ADMIN" && (target.role === "ADMIN" || target.role === "SUB_ADMIN")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Only ADMIN can promote to SUB_ADMIN or ADMIN
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { status, role } = parsed.data;

  if (role && (role === "SUB_ADMIN" || role === "ADMIN") && callerRole !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can promote users" }, { status: 403 });
  }

  // Prevent modifying the caller's own role/status
  if (id === session.user.id && (role || status === "DISABLED")) {
    return NextResponse.json({ error: "Cannot modify your own account this way" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(role !== undefined ? { role } : {}),
    },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
