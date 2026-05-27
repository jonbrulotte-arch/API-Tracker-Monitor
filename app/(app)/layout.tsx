import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "next-auth/react";
import { startScheduler } from "@/lib/scheduler";
import { getAppName } from "@/lib/app-config";

// Start the background monitor scheduler (server-side, once)
if (process.env.NODE_ENV !== "test") {
  startScheduler();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.status === "PENDING") redirect("/pending");
  if (session.user.status === "DISABLED") redirect("/login");

  const appName = await getAppName();

  return (
    <SessionProvider>
      <div className="flex h-full min-h-screen">
        <Sidebar appName={appName} />
        <main className="flex-1 ml-56 min-h-screen flex flex-col">{children}</main>
      </div>
    </SessionProvider>
  );
}
