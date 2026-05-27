import { getAppName } from "@/lib/app-config";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const appName = await getAppName();
  return <RegisterForm appName={appName} />;
}
