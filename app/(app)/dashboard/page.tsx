import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { DashboardStats } from "@/components/dashboard/stats";
import { KeysTable } from "@/components/keys/keys-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getExpiryStatus } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const currentUserId = session?.user?.id ?? "";
  const currentUserRole = session?.user?.role ?? "MEMBER";

  const keys = await db.apiKey.findMany({
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      monitorConfig: true,
      monitorResults: { orderBy: { checkedAt: "desc" }, take: 20 },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = keys.length;
  const expiringSoon = keys.filter((k) => {
    const s = getExpiryStatus(k.expiresAt);
    return s === "warning" || s === "critical";
  }).length;
  const expired = keys.filter((k) => getExpiryStatus(k.expiresAt) === "expired").length;
  const monitored = keys.filter((k) => k.monitorConfig?.enabled).length;
  const failing = keys.filter((k) => {
    const recent = k.monitorResults[0];
    return k.monitorConfig?.enabled && recent && !recent.ok;
  }).length;

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Dashboard"
        description="Overview of your API keys and monitor health"
        actions={
          <Link href="/keys/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> Add Key
            </Button>
          </Link>
        }
      />
      <div className="flex-1 p-6 space-y-6">
        <DashboardStats
          total={total}
          expiringSoon={expiringSoon}
          expired={expired}
          monitored={monitored}
          failing={failing}
        />
        <div>
          <h2 className="text-sm font-semibold text-[#e8eaf0] mb-3">All API Keys</h2>
          <KeysTable keys={keys} currentUserId={currentUserId} currentUserRole={currentUserRole} />
        </div>
      </div>
    </div>
  );
}
