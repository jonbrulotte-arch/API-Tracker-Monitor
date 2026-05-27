import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(100).optional(),
}).refine(
  (d) => !d.newPassword || d.currentPassword,
  { message: "Current password required to set a new password", path: ["currentPassword"] }
);

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, email, currentPassword, newPassword } = parsed.data;

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Verify current password if changing password
  if (newPassword) {
    if (!user.password) return NextResponse.json({ error: "Account uses OAuth — cannot set password" }, { status: 400 });
    const valid = await bcrypt.compare(currentPassword!, user.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // Check email uniqueness
  if (email && email !== user.email) {
    const conflict = await db.user.findUnique({ where: { email } });
    if (conflict) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(newPassword ? { password: await bcrypt.hash(newPassword, 12) } : {}),
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(updated);
}
