import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  toUserId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: fromUserId } = await params;

  if (fromUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot reassign your own keys via this endpoint" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { toUserId } = parsed.data;

  if (toUserId === fromUserId) {
    return NextResponse.json({ error: "From and to user must be different" }, { status: 400 });
  }

  const [fromUser, toUser] = await Promise.all([
    db.user.findUnique({ where: { id: fromUserId }, select: { id: true, name: true, email: true } }),
    db.user.findUnique({ where: { id: toUserId }, select: { id: true, name: true, email: true, status: true } }),
  ]);

  if (!fromUser) return NextResponse.json({ error: "Source user not found" }, { status: 404 });
  if (!toUser) return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  if (toUser.status !== "ACTIVE") {
    return NextResponse.json({ error: "Cannot reassign keys to an inactive user" }, { status: 400 });
  }

  const { count } = await db.apiKey.updateMany({
    where: { createdById: fromUserId },
    data: { createdById: toUserId },
  });

  if (count > 0) {
    writeAuditLog({
      action: "reassigned",
      entityType: "user",
      entityId: fromUserId,
      entityName: fromUser.name ?? fromUser.email,
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      details: {
        toUserId,
        toUserEmail: toUser.email,
        toUserName: toUser.name,
        keyCount: count,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ count });
}
