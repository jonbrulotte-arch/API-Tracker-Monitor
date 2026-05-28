import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUB_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, status: true, createdAt: true,
      _count: { select: { apiKeys: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    users.map((u) => ({ ...u, keyCount: u._count.apiKeys, _count: undefined }))
  );
}
