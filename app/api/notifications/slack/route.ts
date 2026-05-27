import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSlackNotification } from "@/lib/notifications";

const webhookSchema = z.object({
  webhookUrl: z.string().url().optional().nullable(),
  notifyOnFailure: z.boolean().optional(),
  notifyOnExpiry: z.boolean().optional(),
  expiryWarningDays: z.number().int().min(1).max(90).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.appSetting.findMany({
    where: { key: { in: ["slack_webhook_url", "notify_on_failure", "notify_on_expiry", "expiry_warning_days"] } },
  });

  const result: Record<string, string> = {};
  for (const s of settings) result[s.key] = s.value;

  return NextResponse.json({
    webhookUrl: result["slack_webhook_url"] ?? "",
    notifyOnFailure: result["notify_on_failure"] !== "false",
    notifyOnExpiry: result["notify_on_expiry"] !== "false",
    expiryWarningDays: Number(result["expiry_warning_days"] ?? 14),
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

  const { webhookUrl, notifyOnFailure, notifyOnExpiry, expiryWarningDays } = parsed.data;

  const upserts = [];
  if (webhookUrl !== undefined) {
    upserts.push(db.appSetting.upsert({
      where: { key: "slack_webhook_url" },
      create: { key: "slack_webhook_url", value: webhookUrl ?? "" },
      update: { value: webhookUrl ?? "" },
    }));
  }
  if (notifyOnFailure !== undefined) {
    upserts.push(db.appSetting.upsert({
      where: { key: "notify_on_failure" },
      create: { key: "notify_on_failure", value: String(notifyOnFailure) },
      update: { value: String(notifyOnFailure) },
    }));
  }
  if (notifyOnExpiry !== undefined) {
    upserts.push(db.appSetting.upsert({
      where: { key: "notify_on_expiry" },
      create: { key: "notify_on_expiry", value: String(notifyOnExpiry) },
      update: { value: String(notifyOnExpiry) },
    }));
  }
  if (expiryWarningDays !== undefined) {
    upserts.push(db.appSetting.upsert({
      where: { key: "expiry_warning_days" },
      create: { key: "expiry_warning_days", value: String(expiryWarningDays) },
      update: { value: String(expiryWarningDays) },
    }));
  }

  await Promise.all(upserts);
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
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
          text: {
            type: "mrkdwn",
            text: "✅ *Slack webhook test successful!*\nYour API Monitor notifications are configured correctly.",
          },
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
