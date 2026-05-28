import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 10 attempts per user per minute
  if (!checkRateLimit(`verify-pw:${session.user.id}`, 10)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { password } = await req.json();
  if (!password) return NextResponse.json({ valid: false });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user?.password) {
    // OAuth-only accounts have no password — allow reveal without verification
    return NextResponse.json({ valid: true });
  }

  const valid = await bcrypt.compare(password, user.password);
  return NextResponse.json({ valid });
}
