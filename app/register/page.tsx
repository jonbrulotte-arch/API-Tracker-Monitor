import { getAppName } from "@/lib/app-config";
import { db } from "@/lib/db";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const [appName, userCount, regSetting] = await Promise.all([
    getAppName(),
    db.user.count(),
    db.appSetting.findUnique({ where: { key: "allow_registration" } }),
  ]);

  // Always allow the very first admin to register, even if the setting is off
  const registrationOpen = userCount === 0 || regSetting?.value !== "false";

  return <RegisterForm appName={appName} registrationOpen={registrationOpen} />;
}
