import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [nameSetting, regSetting] = await Promise.all([
    db.appSetting.findUnique({ where: { key: "app_name" } }),
    db.appSetting.findUnique({ where: { key: "allow_registration" } }),
  ]);

  return NextResponse.json({
    appName: nameSetting?.value || "API Monitor",
    allowRegistration: regSetting?.value !== "false",
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const ops: Promise<unknown>[] = [];

  if ("appName" in body) {
    const appName = body.appName;
    if (!appName?.trim()) {
      return NextResponse.json({ error: "App name is required" }, { status: 400 });
    }
    if (appName.trim().length > 64) {
      return NextResponse.json({ error: "App name must be 64 characters or fewer" }, { status: 400 });
    }
    ops.push(
      db.appSetting.upsert({
        where: { key: "app_name" },
        update: { value: appName.trim() },
        create: { key: "app_name", value: appName.trim() },
      })
    );
  }

  if ("allowRegistration" in body) {
    const allow = body.allowRegistration === true;
    ops.push(
      db.appSetting.upsert({
        where: { key: "allow_registration" },
        update: { value: String(allow) },
        create: { key: "allow_registration", value: String(allow) },
      })
    );
  }

  if (ops.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await Promise.all(ops);
  return NextResponse.json({ success: true });
}
