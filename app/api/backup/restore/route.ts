import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { encrypt } from "@/lib/crypto";

interface BackupData {
  version: number;
  exportedAt: string;
  apiKeys?: {
    id: string;
    name: string;
    provider: string;
    encryptedValue: string;
    expiresAt: string | null;
    tags: string;
    notes: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    createdById: string;
  }[];
  monitorConfigs?: {
    id: string;
    apiKeyId: string;
    endpoint: string;
    method: string;
    injectionType: string;
    injectionKey: string;
    injectionFormat: string | null;
    expectedStatus: number;
    intervalMinutes: number;
    enabled: boolean;
  }[];
  appSettings?: { key: string; value: string }[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let encryptedPayload: string;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    encryptedPayload = await (file as File).text();
  } else {
    const text = await req.text();
    encryptedPayload = text;
  }

  let data: BackupData;
  try {
    const json = decrypt(encryptedPayload.trim());
    data = JSON.parse(json);
  } catch {
    return NextResponse.json({ error: "Failed to decrypt backup — wrong encryption key or corrupted file" }, { status: 400 });
  }

  if (!data.version || !data.apiKeys) {
    return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
  }

  // Restore API keys (upsert by id)
  let restoredKeys = 0;
  for (const key of data.apiKeys) {
    try {
      await db.apiKey.upsert({
        where: { id: key.id },
        create: {
          id: key.id,
          name: key.name,
          provider: key.provider,
          encryptedValue: key.encryptedValue,
          expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
          tags: key.tags,
          notes: key.notes,
          status: key.status,
          createdAt: new Date(key.createdAt),
          updatedAt: new Date(key.updatedAt),
          createdById: session.user.id, // assign to current admin
        },
        update: {
          name: key.name,
          provider: key.provider,
          encryptedValue: key.encryptedValue,
          expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
          tags: key.tags,
          notes: key.notes,
          status: key.status,
        },
      });
      restoredKeys++;
    } catch {
      // Skip keys that fail (e.g. constraint issues)
    }
  }

  // Restore monitor configs (upsert by apiKeyId)
  let restoredMonitors = 0;
  if (data.monitorConfigs) {
    for (const mc of data.monitorConfigs) {
      try {
        await db.monitorConfig.upsert({
          where: { apiKeyId: mc.apiKeyId },
          create: {
            id: mc.id,
            apiKeyId: mc.apiKeyId,
            endpoint: mc.endpoint,
            method: mc.method,
            injectionType: mc.injectionType,
            injectionKey: mc.injectionKey,
            injectionFormat: mc.injectionFormat,
            expectedStatus: mc.expectedStatus,
            intervalMinutes: mc.intervalMinutes,
            enabled: mc.enabled,
          },
          update: {
            endpoint: mc.endpoint,
            method: mc.method,
            injectionType: mc.injectionType,
            injectionKey: mc.injectionKey,
            injectionFormat: mc.injectionFormat,
            expectedStatus: mc.expectedStatus,
            intervalMinutes: mc.intervalMinutes,
            enabled: mc.enabled,
          },
        });
        restoredMonitors++;
      } catch {
        // Skip on error
      }
    }
  }

  // Restore app settings (skip sensitive ones like smtp_pass)
  const SKIP_SETTINGS = new Set(["smtp_pass"]);
  let restoredSettings = 0;
  if (data.appSettings) {
    for (const s of data.appSettings) {
      if (SKIP_SETTINGS.has(s.key)) continue;
      try {
        await db.appSetting.upsert({
          where: { key: s.key },
          create: { key: s.key, value: s.value },
          update: { value: s.value },
        });
        restoredSettings++;
      } catch {
        // Skip
      }
    }
  }

  return NextResponse.json({
    success: true,
    restored: {
      apiKeys: restoredKeys,
      monitorConfigs: restoredMonitors,
      appSettings: restoredSettings,
    },
  });
}
