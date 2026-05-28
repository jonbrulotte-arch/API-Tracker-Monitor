import { getAppName } from "@/lib/app-config";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const appName = await getAppName();
  return <LoginForm appName={appName} />;
}
