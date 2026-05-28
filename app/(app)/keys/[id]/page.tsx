import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { UptimeChart } from "@/components/monitors/uptime-chart";
import { MonitorConfigForm } from "@/components/monitors/monitor-config-form";
import { getExpiryStatus, formatDate, formatRelative } from "@/lib/utils";
import { Edit, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function KeyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id ?? "";
  const currentUserRole = session?.user?.role ?? "MEMBER";

  const key = await db.apiKey.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      monitorConfig: true,
      monitorResults: { orderBy: { checkedAt: "desc" }, take: 100 },
    },
  });

  if (!key) notFound();

  const isPrivileged = currentUserRole === "ADMIN" || currentUserRole === "SUB_ADMIN";
  const canWrite = isPrivileged || key.createdById === currentUserId;

  const expiryStatus = getExpiryStatus(key.expiresAt);
  const tags: string[] = JSON.parse(key.tags);
  const latestResult = key.monitorResults[0];
  const uptime =
    key.monitorResults.length > 0
      ? Math.round(
          (key.monitorResults.filter((r) => r.ok).length / key.monitorResults.length) * 1000
        ) / 10
      : null;

  const expiryVariant =
    expiryStatus === "expired" || expiryStatus === "critical"
      ? "danger"
      : expiryStatus === "warning"
      ? "warning"
      : expiryStatus === "healthy"
      ? "success"
      : "muted";

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title={key.name}
        description={key.provider}
        actions={
          canWrite ? (
            <Link href={`/keys/${id}/edit`}>
              <Button size="sm" variant="secondary">
                <Edit className="h-3.5 w-3.5" /> Edit Key
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div className="flex-1 p-6 space-y-5">
        {/* Info row */}
        <div className="flex flex-wrap gap-2 items-center">
          {expiryStatus !== "none" && (
            <Badge variant={expiryVariant} dot>
              {expiryStatus === "expired" ? "Expired" : `Expires ${formatRelative(key.expiresAt)}`}
              {key.expiresAt && ` (${formatDate(key.expiresAt)})`}
            </Badge>
          )}
          {expiryStatus === "none" && <Badge variant="muted">No expiry</Badge>}
          {latestResult && (
            <Badge variant={latestResult.ok ? "success" : "danger"} dot>
              Monitor {latestResult.ok ? "healthy" : "failing"}
            </Badge>
          )}
          {uptime !== null && (
            <Badge variant="info">{uptime}% uptime (last 100 checks)</Badge>
          )}
          {tags.map((t) => (
            <Badge key={t} variant="muted">{t}</Badge>
          ))}
        </div>

        {key.notes && (
          <Card>
            <p className="text-sm text-[#8892a4] whitespace-pre-wrap">{key.notes}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Monitor config */}
          <Card>
            <CardHeader>
              <CardTitle>Monitor Configuration</CardTitle>
              {key.monitorConfig?.endpoint && (
                <a
                  href={key.monitorConfig.endpoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#8892a4] hover:text-blue-400 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {new URL(key.monitorConfig.endpoint).host}
                </a>
              )}
            </CardHeader>
            <MonitorConfigForm keyId={id} config={key.monitorConfig} canWrite={canWrite} />
          </Card>

          {/* Uptime chart */}
          <Card>
            <CardHeader>
              <CardTitle>Uptime History</CardTitle>
              <span className="text-xs text-[#8892a4]">Last {key.monitorResults.length} checks</span>
            </CardHeader>
            <UptimeChart results={key.monitorResults} />
          </Card>
        </div>

        {/* Recent results */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Check Results</CardTitle>
          </CardHeader>
          {key.monitorResults.length === 0 ? (
            <p className="text-sm text-[#8892a4]">No checks run yet. Save a monitor config and click "Test Now".</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#8892a4] border-b border-[#1e2535]">
                    <th className="py-2 pr-4 text-left font-medium">Time</th>
                    <th className="py-2 pr-4 text-left font-medium">Status</th>
                    <th className="py-2 pr-4 text-left font-medium">HTTP</th>
                    <th className="py-2 pr-4 text-left font-medium">Response</th>
                    <th className="py-2 text-left font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {key.monitorResults.slice(0, 20).map((r) => (
                    <tr key={r.id} className="border-b border-[#1a2030] last:border-0">
                      <td className="py-2 pr-4 text-[#8892a4] font-mono">
                        {new Date(r.checkedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={r.ok ? "success" : "danger"} dot>
                          {r.ok ? "OK" : "FAIL"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 font-mono text-[#8892a4]">{r.statusCode ?? "—"}</td>
                      <td className="py-2 pr-4 font-mono text-[#8892a4]">
                        {r.responseMs != null ? `${r.responseMs}ms` : "—"}
                      </td>
                      <td className="py-2 text-red-400 max-w-xs truncate">{r.errorMessage ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
