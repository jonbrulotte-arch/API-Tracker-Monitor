import { db } from "./db";

async function logTeams(opts: {
  type: string;
  keyName?: string;
  provider?: string;
  message: string;
  success: boolean;
  error?: string;
}) {
  try {
    await db.notificationLog.create({ data: { channel: "teams", ...opts } });
  } catch {
    // logging failure must not break the caller
  }
}

async function getWebhookUrl(): Promise<string | null> {
  const s = await db.appSetting.findUnique({ where: { key: "teams_webhook_url" } });
  return s?.value || null;
}

async function isEnabled(settingKey: string): Promise<boolean> {
  const s = await db.appSetting.findUnique({ where: { key: settingKey } });
  return s?.value !== "false";
}

export async function sendTeamsNotification(
  title: string,
  text: string,
  facts?: { name: string; value: string }[],
  logOpts?: { type: string; keyName?: string; provider?: string }
): Promise<boolean> {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) return false;

  // MessageCard format — supported by both classic connectors and Workflow webhooks
  const body = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    "themeColor": "0076D7",
    "summary": title,
    "sections": [
      {
        "activityTitle": `**${title}**`,
        "activitySubtitle": text,
        ...(facts && facts.length > 0
          ? { facts: facts.map((f) => ({ name: f.name + ":", value: f.value })) }
          : {}),
        "markdown": true,
      },
    ],
  };

  let success = false;
  let errorMsg: string | undefined;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    success = res.ok;
    if (!success) errorMsg = `HTTP ${res.status}`;
  } catch (err) {
    success = false;
    errorMsg = err instanceof Error ? err.message : "Unknown error";
  }

  if (logOpts) {
    await logTeams({
      type: logOpts.type,
      keyName: logOpts.keyName,
      provider: logOpts.provider,
      message: title,
      success,
      error: errorMsg,
    });
  }

  return success;
}

export async function teamsNotifyMonitorRecovered(keyName: string, provider: string) {
  if (!await isEnabled("teams_notify_on_failure")) return;
  await sendTeamsNotification(
    "✅ Monitor Recovered",
    `Checked at ${new Date().toUTCString()}`,
    [
      { name: "Key", value: keyName },
      { name: "Provider", value: provider },
      { name: "Status", value: "Back online" },
    ],
    { type: "monitor_recovered", keyName, provider }
  );
}

export async function teamsNotifyMonitorFailure(keyName: string, provider: string, errorMessage: string, statusCode?: number | null) {
  if (!await isEnabled("teams_notify_on_failure")) return;
  await sendTeamsNotification(
    "🚨 API Key Monitor Failure",
    `Checked at ${new Date().toUTCString()}`,
    [
      { name: "Key", value: keyName },
      { name: "Provider", value: provider },
      { name: "Status Code", value: String(statusCode ?? "N/A") },
      { name: "Error", value: errorMessage ?? "Unknown" },
    ],
    { type: "monitor_failure", keyName, provider }
  );
}

export async function teamsNotifyKeyExpiry(keyName: string, provider: string, daysUntilExpiry: number) {
  const urgency = daysUntilExpiry <= 3 ? "🔴" : daysUntilExpiry <= 7 ? "🟡" : "🟠";
  await sendTeamsNotification(
    `${urgency} API Key Expiry Warning`,
    `This key expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}.`,
    [
      { name: "Key", value: keyName },
      { name: "Provider", value: provider },
      { name: "Expires In", value: `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}` },
    ],
    { type: "key_expiry", keyName, provider }
  );
}

export async function teamsNotifyKeyAdded(keyName: string, provider: string, addedBy: string) {
  if (!await isEnabled("teams_notify_on_key_add")) return;
  await sendTeamsNotification(
    "✅ API Key Added",
    `Added at ${new Date().toUTCString()}`,
    [
      { name: "Key", value: keyName },
      { name: "Provider", value: provider },
      { name: "Added by", value: addedBy },
    ],
    { type: "key_added", keyName, provider }
  );
}

export async function teamsNotifyKeyRemoved(keyName: string, provider: string, removedBy: string) {
  if (!await isEnabled("teams_notify_on_key_remove")) return;
  await sendTeamsNotification(
    "🗑️ API Key Removed",
    `Removed at ${new Date().toUTCString()}`,
    [
      { name: "Key", value: keyName },
      { name: "Provider", value: provider },
      { name: "Removed by", value: removedBy },
    ],
    { type: "key_removed", keyName, provider }
  );
}
