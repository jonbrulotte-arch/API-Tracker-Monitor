import { db } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const ACTION_VARIANT: Record<string, "success" | "danger" | "warning" | "info" | "muted"> = {
  created: "success",
  updated: "info",
  deleted: "danger",
  revealed: "warning",
  copied: "info",
};

const ACTION_LABEL: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  revealed: "Revealed",
  copied: "Copied",
};

export default async function AuditPage() {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Audit Log" description="Record of all key changes and access events" />
      <div className="flex-1 p-6">
        <Card>
          {logs.length === 0 ? (
            <p className="text-sm text-[#8892a4]">No audit events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#8892a4] border-b border-[#1e2535]">
                    <th className="py-2.5 pr-4 text-left font-medium">Time</th>
                    <th className="py-2.5 pr-4 text-left font-medium">Action</th>
                    <th className="py-2.5 pr-4 text-left font-medium">Key</th>
                    <th className="py-2.5 pr-4 text-left font-medium">Provider</th>
                    <th className="py-2.5 pr-4 text-left font-medium">User</th>
                    <th className="py-2.5 text-left font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    let details: Record<string, unknown> | null = null;
                    try {
                      if (log.details) details = JSON.parse(log.details);
                    } catch { /* ignore */ }

                    return (
                      <tr key={log.id} className="border-b border-[#1a2030] last:border-0 hover:bg-[#0f1117]/50">
                        <td className="py-2.5 pr-4 font-mono text-[#8892a4] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
                          })}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={ACTION_VARIANT[log.action] ?? "muted"}>
                            {ACTION_LABEL[log.action] ?? log.action}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-[#e8eaf0] font-medium max-w-[160px] truncate" title={log.entityName}>
                          {log.entityName}
                        </td>
                        <td className="py-2.5 pr-4 text-[#8892a4]">{log.provider ?? "—"}</td>
                        <td className="py-2.5 pr-4 text-[#8892a4]">
                          <span title={log.userEmail}>{log.userName ?? log.userEmail}</span>
                        </td>
                        <td className="py-2.5 text-[#4a5568] max-w-[240px]">
                          {details ? (
                            <span className="font-mono text-[10px]">
                              {Object.entries(details)
                                .map(([k, v]) => {
                                  if (k === "value") return "value rotated";
                                  if (typeof v === "object" && v !== null && "from" in v && "to" in v) {
                                    const d = v as { from: unknown; to: unknown };
                                    return `${k}: ${String(d.from ?? "—")} → ${String(d.to ?? "—")}`;
                                  }
                                  return `${k}: ${String(v)}`;
                                })
                                .join(" · ")}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
