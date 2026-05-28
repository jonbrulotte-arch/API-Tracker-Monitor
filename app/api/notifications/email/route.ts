import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmailNotification } from "@/lib/email-notifications";

const ALL_KEYS = [
  "smtp_host", "smtp_port", "smtp_secure", "smtp_user",
  "smtp_pass", "smtp_from", "email_to",
  "email_notify_on_failure", "email_notify_on_expiry",
  "email_notify_on_key_add", "email_notify_on_key_remove",
];

const schema = z.object({
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpFrom: z.string().optional().nullable(),
  emailTo: z.string().optional().nullable(),
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
    smtpHost: r["smtp_host"] ?? "",
    smtpPort: Number(r["smtp_port"] ?? 587),
    smtpSecure: r["smtp_secure"] === "true",
    smtpUser: r["smtp_user"] ?? "",
    smtpPass: r["smtp_pass"] ? "••••••••" : "",
    smtpFrom: r["smtp_from"] ?? "",
    emailTo: r["email_to"] ?? "",
    notifyOnFailure: r["email_notify_on_failure"] !== "false",
    notifyOnExpiry: r["email_notify_on_expiry"] !== "false",
    notifyOnKeyAdd: r["email_notify_on_key_add"] !== "false",
    notifyOnKeyRemove: r["email_notify_on_key_remove"] !== "false",
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

  if (d.smtpHost !== undefined) ops.push(upsert("smtp_host", d.smtpHost ?? ""));
  if (d.smtpPort !== undefined) ops.push(upsert("smtp_port", String(d.smtpPort)));
  if (d.smtpSecure !== undefined) ops.push(upsert("smtp_secure", String(d.smtpSecure)));
  if (d.smtpUser !== undefined) ops.push(upsert("smtp_user", d.smtpUser ?? ""));
  // Only update password if not the masked placeholder
  if (d.smtpPass !== undefined && d.smtpPass !== "••••••••") {
    ops.push(upsert("smtp_pass", d.smtpPass ?? ""));
  }
  if (d.smtpFrom !== undefined) ops.push(upsert("smtp_from", d.smtpFrom ?? ""));
  if (d.emailTo !== undefined) ops.push(upsert("email_to", d.emailTo ?? ""));
  if (d.notifyOnFailure !== undefined) ops.push(upsert("email_notify_on_failure", String(d.notifyOnFailure)));
  if (d.notifyOnExpiry !== undefined) ops.push(upsert("email_notify_on_expiry", String(d.notifyOnExpiry)));
  if (d.notifyOnKeyAdd !== undefined) ops.push(upsert("email_notify_on_key_add", String(d.notifyOnKeyAdd)));
  if (d.notifyOnKeyRemove !== undefined) ops.push(upsert("email_notify_on_key_remove", String(d.notifyOnKeyRemove)));

  await Promise.all(ops);
  return NextResponse.json({ success: true });
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await sendEmailNotification(
    "✅ API Monitor — Email test successful!",
    `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#333;padding:24px"><h2>Email notifications are working!</h2><p>Your API Monitor email configuration is correct.</p></body></html>`,
    { type: "test" }
  );

  if (!ok) {
    return NextResponse.json({ error: "Test email failed — check your SMTP settings" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
