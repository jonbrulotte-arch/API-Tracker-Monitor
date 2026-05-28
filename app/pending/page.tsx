import { getAppName } from "@/lib/app-config";
import { PendingContent } from "./pending-content";

export default async function PendingPage() {
  const appName = await getAppName();
  return <PendingContent appName={appName} />;
}
