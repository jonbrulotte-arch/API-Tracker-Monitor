import nodemailer from "nodemailer";
import { db } from "./db";
import { getAppName } from "./app-config";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

async function logEmail(opts: {
  type: string;
  keyName?: string;
  provider?: string;
  message: string;
  success: boolean;
  error?: string;
}) {
  try {
    await db.notificationLog.create({ data: { channel: "email", ...opts } });
  } catch {
    // logging failure must not break the caller
  }
}

async function getSmtpSettings() {
  const keys = [
    "smtp_host", "smtp_port", "smtp_secure", "smtp_user",
    "smtp_pass", "smtp_from", "email_to",
  ];
  const rows = await db.appSetting.findMany({ where: { key: { in: keys } } });
  const m: Record<string, string> = {};
  for (const r of rows) m[r.key] = r.value;
  return m;
}

async function isEnabled(settingKey: string): Promise<boolean> {
  const s = await db.appSetting.findUnique({ where: { key: settingKey } });
  return s?.value !== "false";
}

export async function sendEmailNotification(
  subject: string,
  html: string,
  logOpts?: { type: string; keyName?: string; provider?: string }
): Promise<boolean> {
  const cfg = await getSmtpSettings();
  if (!cfg.smtp_host || !cfg.email_to) return false;

  const transporter = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: Number(cfg.smtp_port ?? 587),
    secure: cfg.smtp_secure === "true",
    auth: cfg.smtp_user
      ? { user: cfg.smtp_user, pass: cfg.smtp_pass ?? "" }
      : undefined,
  });

  let success = false;
  let errorMsg: string | undefined;
  try {
    await transporter.sendMail({
      from: cfg.smtp_from || cfg.smtp_user || "api-monitor@localhost",
      to: cfg.email_to,
      subject,
      html,
    });
    success = true;
  } catch (err) {
    success = false;
    errorMsg = err instanceof Error ? err.message : "Unknown error";
  }

  if (logOpts) {
    await logEmail({
      type: logOpts.type,
      keyName: logOpts.keyName,
      provider: logOpts.provider,
      message: subject,
      success,
      error: errorMsg,
    });
  }

  return success;
}

function baseHtml(title: string, rows: { label: string; value: string }[], footer?: string, appName = "API Monitor"): string {
  const rowsHtml = rows
    .map((r) => `<tr><td style="padding:6px 12px;color:#8892a4;font-weight:600;white-space:nowrap">${escapeHtml(r.label)}</td><td style="padding:6px 12px;color:#e8eaf0">${escapeHtml(r.value)}</td></tr>`)
    .join("");
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#0d1018;font-family:system-ui,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#0f1117;border:1px solid #1e2535;border-radius:8px;overflow:hidden">
    <div style="background:#1a2130;padding:16px 20px;border-bottom:1px solid #1e2535">
      <span style="color:#e8eaf0;font-size:15px;font-weight:700">${escapeHtml(appName)}</span>
    </div>
    <div style="padding:20px">
      <h2 style="margin:0 0 16px;color:#e8eaf0;font-size:16px">${escapeHtml(title)}</h2>
      <table style="border-collapse:collapse;width:100%;background:#0d1018;border:1px solid #1e2535;border-radius:6px;overflow:hidden">
        ${rowsHtml}
      </table>
      ${footer ? `<p style="margin:16px 0 0;color:#4a5568;font-size:12px">${escapeHtml(footer)}</p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

export async function emailNotifyMonitorRecovered(keyName: string, provider: string) {
  if (!await isEnabled("email_notify_on_failure")) return;
  const appName = await getAppName();
  const subject = `✅ Monitor Recovered: ${keyName}`;
  const html = baseHtml("API Key Monitor Recovered", [
    { label: "Key", value: keyName },
    { label: "Provider", value: provider },
    { label: "Status", value: "Back online" },
  ], `Recovered at ${new Date().toUTCString()}`, appName);
  await sendEmailNotification(subject, html, { type: "monitor_recovered", keyName, provider });
}

export async function emailNotifyMonitorFailure(keyName: string, provider: string, errorMessage: string, statusCode?: number | null) {
  if (!await isEnabled("email_notify_on_failure")) return;
  const appName = await getAppName();
  const subject = `🚨 Monitor Failure: ${keyName}`;
  const html = baseHtml("API Key Monitor Failure", [
    { label: "Key", value: keyName },
    { label: "Provider", value: provider },
    { label: "Status Code", value: String(statusCode ?? "N/A") },
    { label: "Error", value: errorMessage ?? "Unknown" },
  ], `Checked at ${new Date().toUTCString()}`, appName);
  await sendEmailNotification(subject, html, { type: "monitor_failure", keyName, provider });
}

export async function emailNotifyKeyExpiry(keyName: string, provider: string, daysUntilExpiry: number) {
  const urgency = daysUntilExpiry <= 3 ? "🔴" : daysUntilExpiry <= 7 ? "🟡" : "🟠";
  const appName = await getAppName();
  const subject = `${urgency} Key Expiry Warning: ${keyName} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`;
  const html = baseHtml(`${urgency} API Key Expiry Warning`, [
    { label: "Key", value: keyName },
    { label: "Provider", value: provider },
    { label: "Expires In", value: `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}` },
  ], undefined, appName);
  await sendEmailNotification(subject, html, { type: "key_expiry", keyName, provider });
}

export async function emailNotifyKeyAdded(keyName: string, provider: string, addedBy: string) {
  if (!await isEnabled("email_notify_on_key_add")) return;
  const appName = await getAppName();
  const subject = `✅ API Key Added: ${keyName}`;
  const html = baseHtml("API Key Added", [
    { label: "Key", value: keyName },
    { label: "Provider", value: provider },
    { label: "Added by", value: addedBy },
  ], `Added at ${new Date().toUTCString()}`, appName);
  await sendEmailNotification(subject, html, { type: "key_added", keyName, provider });
}

export async function emailNotifyKeyRemoved(keyName: string, provider: string, removedBy: string) {
  if (!await isEnabled("email_notify_on_key_remove")) return;
  const appName = await getAppName();
  const subject = `🗑️ API Key Removed: ${keyName}`;
  const html = baseHtml("API Key Removed", [
    { label: "Key", value: keyName },
    { label: "Provider", value: provider },
    { label: "Removed by", value: removedBy },
  ], `Removed at ${new Date().toUTCString()}`, appName);
  await sendEmailNotification(subject, html, { type: "key_removed", keyName, provider });
}
