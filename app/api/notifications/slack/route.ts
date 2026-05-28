import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { sendSlackNotification } from "@/lib/notifications";

const ALL_KEYS = [
  "slack_webhook_url", "notify_on_failure", "notify_on_expiry",
  "notify_on_key_add", "notify_on_key_remove",
];

const webhookSchema = z.object({
  webhookUrl: z.string().url().optional().nullable(),
  notifyOnFailure: z.boolean().optional(),
  notifyOnExpiry: z.boolean().optional(),
  notifyOnKeyAdd: z.boolean().optional(),
  notifyOnKeyRemove: z.boolean().optional(),
});

function upsertSetting(key: string, value: string) {
  return db.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await db.appSetting.findMany({ where: { key: { in: ALL_KEYS } } });
  const r: Record<string, string> = {};
  for (const s of settings) r[s.key] = s.value;

  return NextResponse.json({
    webhookUrl: r["slack_webhook_url"] ? "••••••••" : "",
    notifyOnFailure: r["notify_on_failure"] !== "false",
    notifyOnExpiry: r["notify_on_expiry"] !== "false",
    notifyOnKeyAdd: r["notify_on_key_add"] !== "false",
    notifyOnKeyRemove: r["notify_on_key_remove"] !== "false",
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { webhookUrl, notifyOnFailure, notifyOnExpiry, notifyOnKeyAdd, notifyOnKeyRemove } = parsed.data;

  const ops = [
    // Skip update if the masked placeholder was sent back; encrypt new values at rest
    ...(webhookUrl !== undefined && webhookUrl !== "••••••••"
      ? [upsertSetting("slack_webhook_url", webhookUrl ? encrypt(webhookUrl) : "")]
      : []),
    ...(notifyOnFailure !== undefined ? [upsertSetting("notify_on_failure", String(notifyOnFailure))] : []),
    ...(notifyOnExpiry !== undefined ? [upsertSetting("notify_on_expiry", String(notifyOnExpiry))] : []),
    ...(notifyOnKeyAdd !== undefined ? [upsertSetting("notify_on_key_add", String(notifyOnKeyAdd))] : []),
    ...(notifyOnKeyRemove !== undefined ? [upsertSetting("notify_on_key_remove", String(notifyOnKeyRemove))] : []),
  ];

  await Promise.all(ops);
  return NextResponse.json({ success: true });
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await sendSlackNotification(
    {
      text: "✅ API Monitor — Slack webhook test successful!",
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: "✅ *Slack webhook test successful!*\nYour API Monitor notifications are configured correctly." },
        },
      ],
    },
    { type: "test" }
  );

  if (!ok) {
    return NextResponse.json({ error: "Test message failed — check your webhook URL" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
