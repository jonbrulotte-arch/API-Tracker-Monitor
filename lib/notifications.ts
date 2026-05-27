import { db } from "./db";

export interface SlackNotification {
  text: string;
  blocks?: object[];
}

async function logSlack(opts: {
  type: string;
  keyName?: string;
  provider?: string;
  message: string;
  success: boolean;
}) {
  try {
    await db.slackLog.create({ data: opts });
  } catch {
    // logging failure must not break the caller
  }
}

async function isEnabled(settingKey: string): Promise<boolean> {
  const s = await db.appSetting.findUnique({ where: { key: settingKey } });
  return s?.value !== "false";
}

export async function sendSlackNotification(
  payload: SlackNotification,
  logOpts?: { type: string; keyName?: string; provider?: string }
): Promise<boolean> {
  const setting = await db.appSetting.findUnique({ where: { key: "slack_webhook_url" } });
  if (!setting?.value) return false;

  let success = false;
  try {
    const res = await fetch(setting.value, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    success = res.ok;
  } catch {
    success = false;
  }

  if (logOpts) {
    await logSlack({
      type: logOpts.type,
      keyName: logOpts.keyName,
      provider: logOpts.provider,
      message: payload.text,
      success,
    });
  }

  return success;
}

export async function notifyMonitorFailure(keyName: string, provider: string, errorMessage: string, statusCode?: number | null) {
  if (!await isEnabled("notify_on_failure")) return;
  await sendSlackNotification(
    {
      text: `*API Key Monitor Alert* — ${keyName} (${provider}) is failing`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: "🚨 API Key Monitor Failure", emoji: true } },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Key:*\n${keyName}` },
            { type: "mrkdwn", text: `*Provider:*\n${provider}` },
            { type: "mrkdwn", text: `*Status Code:*\n${statusCode ?? "N/A"}` },
            { type: "mrkdwn", text: `*Error:*\n${errorMessage ?? "Unknown"}` },
          ],
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `Checked at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>` }],
        },
      ],
    },
    { type: "monitor_failure", keyName, provider }
  );
}

export async function notifyKeyExpiry(keyName: string, provider: string, daysUntilExpiry: number) {
  const urgency = daysUntilExpiry <= 3 ? "🔴" : daysUntilExpiry <= 7 ? "🟡" : "🟠";
  await sendSlackNotification(
    {
      text: `${urgency} API Key *${keyName}* (${provider}) expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: `${urgency} API Key Expiry Warning`, emoji: true } },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Key:*\n${keyName}` },
            { type: "mrkdwn", text: `*Provider:*\n${provider}` },
            { type: "mrkdwn", text: `*Expires In:*\n${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}` },
          ],
        },
      ],
    },
    { type: "key_expiry", keyName, provider }
  );
}

export async function notifyKeyAdded(keyName: string, provider: string, addedBy: string) {
  if (!await isEnabled("notify_on_key_add")) return;
  await sendSlackNotification(
    {
      text: `✅ New API key added: *${keyName}* (${provider})`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: "✅ API Key Added", emoji: true } },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Key:*\n${keyName}` },
            { type: "mrkdwn", text: `*Provider:*\n${provider}` },
            { type: "mrkdwn", text: `*Added by:*\n${addedBy}` },
          ],
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `Added at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>` }],
        },
      ],
    },
    { type: "key_added", keyName, provider }
  );
}

export async function notifyKeyRemoved(keyName: string, provider: string, removedBy: string) {
  if (!await isEnabled("notify_on_key_remove")) return;
  await sendSlackNotification(
    {
      text: `🗑️ API key removed: *${keyName}* (${provider})`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: "🗑️ API Key Removed", emoji: true } },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Key:*\n${keyName}` },
            { type: "mrkdwn", text: `*Provider:*\n${provider}` },
            { type: "mrkdwn", text: `*Removed by:*\n${removedBy}` },
          ],
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `Removed at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>` }],
        },
      ],
    },
    { type: "key_removed", keyName, provider }
  );
}
