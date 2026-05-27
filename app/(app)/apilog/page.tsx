import { db } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function statusVariant(code: number): "success" | "warning" | "danger" | "muted" {
  if (code < 300) return "success";
  if (code < 400) return "warning";
  if (code < 500) return "danger";
  return "danger";
}

export default async function ApiLogPage() {
  const logs = await db.apiLog.findMany({
    orderBy: { requestedAt: "desc" },
    take: 500,
  });

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="API Call Log" description="All inbound calls to the external REST API (/api/v1/*)" />
      <div className="flex-1 p-6">
        <Card>
          {logs.length === 0 ? (
            <p className="text-sm text-[#8892a4]">No API calls recorded yet. Make a request to <code className="text-blue-400">/api/v1/keys</code> using an access token to see it here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#8892a4] border-b border-[#1e2535]">
                    <th className="py-2.5 pr-4 text-left font-medium">Time</th>
                    <th className="py-2.5 pr-4 text-left font-medium">Method</th>
                    <th className="py-2.5 pr-4 text-left font-medium">Path</th>
                    <th className="py-2.5 pr-4 text-left font-medium">Token</th>
                    <th className="py-2.5 pr-4 text-left font-medium">Key</th>
                    <th className="py-2.5 pr-4 text-left font-medium">Status</th>
                    <th className="py-2.5 pr-4 text-left font-medium">Time</th>
                    <th className="py-2.5 text-left font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[#1a2030] last:border-0 hover:bg-[#0f1117]/50">
                      <td className="py-2.5 pr-4 font-mono text-[#8892a4] whitespace-nowrap">
                        {new Date(log.requestedAt).toLocaleString("en-US", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
                        })}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="font-mono text-[10px] font-bold text-blue-400">{log.method}</span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-[#8892a4] max-w-[220px] truncate" title={log.path}>
                        {log.path}
                      </td>
                      <td className="py-2.5 pr-4 text-[#8892a4]">
                        {log.tokenName ? (
                          <span title={`Prefix: ${log.tokenPrefix}`}>
                            {log.tokenName}
                            <span className="text-[#4a5568] ml-1 font-mono text-[10px]">({log.tokenPrefix}…)</span>
                          </span>
                        ) : (
                          <span className="text-[#4a5568] italic">unauthenticated</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-[#8892a4]">{log.keyName ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={statusVariant(log.statusCode)}>
                          {log.statusCode}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-[#8892a4]">{log.responseMs}ms</td>
                      <td className="py-2.5 font-mono text-[#4a5568]">{log.ipAddress ?? "—"}</td>
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
