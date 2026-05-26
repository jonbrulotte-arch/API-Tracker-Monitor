import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { User, Shield } from "lucide-react";
import { SlackSettings } from "@/components/settings/slack-settings";
import { AccessTokenSettings } from "@/components/settings/access-token-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const users = isAdmin
    ? await db.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Settings" description="Account and team configuration" />
      <div className="flex-1 p-6 space-y-5 max-w-2xl">
        {/* Account card */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
              {session?.user?.name?.charAt(0).toUpperCase() ?? session?.user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-[#e8eaf0]">{session?.user?.name ?? "—"}</p>
              <p className="text-xs text-[#8892a4]">{session?.user?.email}</p>
            </div>
            <Badge variant={isAdmin ? "info" : "muted"} className="ml-auto">
              {isAdmin ? (
                <><Shield className="h-3 w-3" /> Admin</>
              ) : (
                <><User className="h-3 w-3" /> Member</>
              )}
            </Badge>
          </div>
          <div className="text-xs text-[#8892a4]">
            <p>To change your password, sign out and register again, or contact an admin.</p>
          </div>
        </Card>

        {/* Access token API */}
        <AccessTokenSettings />

        {/* Slack notifications */}
        {isAdmin && <SlackSettings />}

        {/* Environment info */}
        <Card>
          <h3 className="text-sm font-semibold text-[#e8eaf0] mb-3">Environment</h3>
          <div className="space-y-2 text-xs text-[#8892a4]">
            <div className="flex justify-between">
              <span>Key Encryption</span>
              <span className="text-green-400">AES-256-GCM ✓</span>
            </div>
            <div className="flex justify-between">
              <span>Database</span>
              <span className="text-[#e8eaf0]">SQLite (Prisma)</span>
            </div>
            <div className="flex justify-between">
              <span>Auth Providers</span>
              <span className="text-[#e8eaf0]">Credentials{process.env.AUTH_GITHUB_ID ? ", GitHub" : ""}</span>
            </div>
          </div>
        </Card>

        {/* Team members (admin only) */}
        {isAdmin && users.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-[#e8eaf0] mb-3">Team Members ({users.length})</h3>
            <div className="divide-y divide-[#1e2535]">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="text-[#e8eaf0]">{u.name ?? u.email}</p>
                    {u.name && <p className="text-xs text-[#8892a4]">{u.email}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#4a5568]">Joined {formatDate(u.createdAt)}</span>
                    <Badge variant={u.role === "ADMIN" ? "info" : "muted"}>{u.role}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
