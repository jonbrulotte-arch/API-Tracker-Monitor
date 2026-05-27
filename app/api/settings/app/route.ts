import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const s = await db.appSetting.findUnique({ where: { key: "app_name" } });
  return NextResponse.json({ appName: s?.value || "API Monitor" });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appName } = await req.json();
  if (!appName?.trim()) {
    return NextResponse.json({ error: "App name is required" }, { status: 400 });
  }

  await db.appSetting.upsert({
    where: { key: "app_name" },
    update: { value: appName.trim() },
    create: { key: "app_name", value: appName.trim() },
  });

  return NextResponse.json({ appName: appName.trim() });
}
