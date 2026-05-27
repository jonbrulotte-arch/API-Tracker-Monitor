import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { SlackSettings } from "@/components/settings/slack-settings";
import { AccessTokenSettings } from "@/components/settings/access-token-settings";
import { TeamSettings } from "@/components/settings/team-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const role = session?.user?.role ?? "MEMBER";
  const isAdmin = role === "ADMIN";
  const isAdminOrSub = isAdmin || role === "SUB_ADMIN";

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Settings" description="Account and team configuration" />
      <div className="flex-1 p-6 space-y-5 max-w-2xl">

        {/* Profile — name, email, password */}
        <ProfileSettings
          id={session?.user?.id ?? ""}
          name={session?.user?.name ?? null}
          email={session?.user?.email ?? ""}
          role={role}
        />

        {/* Access token API */}
        <AccessTokenSettings />

        {/* Slack notifications — admin only */}
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

        {/* Team management — admin and sub-admin */}
        {isAdminOrSub && (
          <TeamSettings
            currentUserId={session?.user?.id ?? ""}
            currentUserRole={role}
          />
        )}

      </div>
    </div>
  );
}
