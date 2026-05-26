import { db } from "./db";

export interface SlackNotification {
  text: string;
  blocks?: object[];
}

export async function sendSlackNotification(payload: SlackNotification): Promise<boolean> {
  const setting = await db.appSetting.findUnique({ where: { key: "slack_webhook_url" } });
  if (!setting?.value) return false;

  try {
    const res = await fetch(setting.value, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyMonitorFailure(keyName: string, provider: string, errorMessage: string, statusCode?: number | null) {
  await sendSlackNotification({
    text: `*API Key Monitor Alert* — ${keyName} (${provider}) is failing`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🚨 API Key Monitor Failure", emoji: true },
      },
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
        elements: [
          { type: "mrkdwn", text: `Checked at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>` },
        ],
      },
    ],
  });
}

export async function notifyKeyExpiry(keyName: string, provider: string, daysUntilExpiry: number) {
  const urgency = daysUntilExpiry <= 3 ? "🔴" : daysUntilExpiry <= 7 ? "🟡" : "🟠";
  await sendSlackNotification({
    text: `${urgency} API Key *${keyName}* (${provider}) expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `${urgency} API Key Expiry Warning`, emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Key:*\n${keyName}` },
          { type: "mrkdwn", text: `*Provider:*\n${provider}` },
          { type: "mrkdwn", text: `*Expires In:*\n${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}` },
        ],
      },
    ],
  });
}
