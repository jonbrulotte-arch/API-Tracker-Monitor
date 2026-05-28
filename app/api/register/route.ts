import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-logger";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  // 5 registrations per IP per hour
  const ip = getClientIp(req);
  if (!checkRateLimit(`register:${ip}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many registration attempts." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const existingUsers = await db.user.count();
  const isFirst = existingUsers === 0;

  // Enforce registration-closed setting (never block the very first admin)
  if (!isFirst) {
    const allowReg = await db.appSetting.findUnique({ where: { key: "allow_registration" } });
    if (allowReg?.value === "false") {
      return NextResponse.json({ error: "Registration is currently closed." }, { status: 403 });
    }
  }
  const role = isFirst ? "ADMIN" : "MEMBER";
  const status = isFirst ? "ACTIVE" : "PENDING";

  const hashed = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { name, email, password: hashed, role, status },
    select: { id: true, email: true, name: true, role: true, status: true },
  });

  return NextResponse.json(user, { status: 201 });
}
