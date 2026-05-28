import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { sendTeamsNotification } from "@/lib/teams-notifications";

const ALL_KEYS = [
  "teams_webhook_url",
  "teams_notify_on_failure", "teams_notify_on_expiry",
  "teams_notify_on_key_add", "teams_notify_on_key_remove",
];

const schema = z.object({
  webhookUrl: z.string().url().optional().nullable(),
  notifyOnFailure: z.boolean().optional(),
  notifyOnExpiry: z.boolean().optional(),
  notifyOnKeyAdd: z.boolean().optional(),
  notifyOnKeyRemove: z.boolean().optional(),
});

function upsert(key: string, value: string) {
  return db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db.appSetting.findMany({ where: { key: { in: ALL_KEYS } } });
  const r: Record<string, string> = {};
  for (const row of rows) r[row.key] = row.value;

  return NextResponse.json({
    webhookUrl: r["teams_webhook_url"] ? "••••••••" : "",
    notifyOnFailure: r["teams_notify_on_failure"] !== "false",
    notifyOnExpiry: r["teams_notify_on_expiry"] !== "false",
    notifyOnKeyAdd: r["teams_notify_on_key_add"] !== "false",
    notifyOnKeyRemove: r["teams_notify_on_key_remove"] !== "false",
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const ops: Promise<unknown>[] = [];

  // Skip update if the masked placeholder was sent back; encrypt new values at rest
  if (d.webhookUrl !== undefined && d.webhookUrl !== "••••••••") {
    ops.push(upsert("teams_webhook_url", d.webhookUrl ? encrypt(d.webhookUrl) : ""));
  }
  if (d.notifyOnFailure !== undefined) ops.push(upsert("teams_notify_on_failure", String(d.notifyOnFailure)));
  if (d.notifyOnExpiry !== undefined) ops.push(upsert("teams_notify_on_expiry", String(d.notifyOnExpiry)));
  if (d.notifyOnKeyAdd !== undefined) ops.push(upsert("teams_notify_on_key_add", String(d.notifyOnKeyAdd)));
  if (d.notifyOnKeyRemove !== undefined) ops.push(upsert("teams_notify_on_key_remove", String(d.notifyOnKeyRemove)));

  await Promise.all(ops);
  return NextResponse.json({ success: true });
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await sendTeamsNotification(
    "✅ API Monitor — Teams webhook test successful!",
    "Your Microsoft Teams notifications are configured correctly.",
    [],
    { type: "test" }
  );

  if (!ok) {
    return NextResponse.json({ error: "Test message failed — check your webhook URL" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
