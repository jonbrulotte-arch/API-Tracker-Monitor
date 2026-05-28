import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { KeysTable } from "@/components/keys/keys-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function KeysPage() {
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

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="API Keys"
        description={`${keys.length} key${keys.length !== 1 ? "s" : ""} total`}
        actions={
          <Link href="/keys/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> Add Key
            </Button>
          </Link>
        }
      />
      <div className="flex-1 p-6">
        <KeysTable keys={keys} currentUserId={currentUserId} currentUserRole={currentUserRole} />
      </div>
    </div>
  );
}
