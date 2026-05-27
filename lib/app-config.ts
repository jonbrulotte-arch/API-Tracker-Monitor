import { db } from "./db";

export async function getAppName(): Promise<string> {
  try {
    const s = await db.appSetting.findUnique({ where: { key: "app_name" } });
    return s?.value || "API Monitor";
  } catch {
    return "API Monitor";
  }
}
