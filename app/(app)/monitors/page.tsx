import { db } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatMs, formatRelative } from "@/lib/utils";
import { Activity, Clock, CheckCircle, XCircle, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MonitorsPage() {
  const keys = await db.apiKey.findMany({
    include: {
      monitorConfig: true,
      monitorResults: { orderBy: { checkedAt: "desc" }, take: 20 },
    },
    orderBy: { createdAt: "desc" },
  });

  const monitored = keys.filter((k) => k.monitorConfig);
  const unmonitored = keys.filter((k) => !k.monitorConfig);

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Monitors"
        description={`${monitored.length} active monitor${monitored.length !== 1 ? "s" : ""}`}
      />
      <div className="flex-1 p-6 space-y-6">
        {monitored.length === 0 && (
          <Card className="text-center py-12">
            <Activity className="h-8 w-8 text-[#4a5568] mx-auto mb-3" />
            <p className="text-sm text-[#8892a4]">No monitors configured yet.</p>
            <p className="text-xs text-[#4a5568] mt-1">
              Open any API key and configure a monitor endpoint.
            </p>
          </Card>
        )}

        {monitored.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider mb-3">
              Monitored Keys ({monitored.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {monitored.map((key) => {
                const config = key.monitorConfig!;
                const results = key.monitorResults;
                const latest = results[0];
                const uptime =
                  results.length > 0
                    ? Math.round((results.filter((r) => r.ok).length / results.length) * 1000) / 10
                    : null;
                const avgMs =
                  results.filter((r) => r.responseMs != null).length > 0
                    ? Math.round(
                        results.reduce((s, r) => s + (r.responseMs ?? 0), 0) /
                          results.filter((r) => r.responseMs != null).length
                      )
                    : null;

                return (
                  <Link key={key.id} href={`/keys/${key.id}`}>
                    <Card className="hover:border-blue-500/30 transition-colors cursor-pointer h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-[#e8eaf0]">{key.name}</p>
                          <p className="text-xs text-[#8892a4] mt-0.5">{key.provider}</p>
                        </div>
                        {!config.enabled ? (
                          <Badge variant="muted"><Minus className="h-3 w-3" /> Disabled</Badge>
                        ) : !latest ? (
                          <Badge variant="muted">Pending</Badge>
                        ) : latest.ok ? (
                          <Badge variant="success" dot><CheckCircle className="h-3 w-3" /> Healthy</Badge>
                        ) : (
                          <Badge variant="danger" dot><XCircle className="h-3 w-3" /> Failing</Badge>
                        )}
                      </div>

                      <div className="text-xs text-[#4a5568] truncate mb-3 font-mono">
                        {config.method} {config.endpoint}
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        {uptime !== null && (
                          <div>
                            <span className="text-[#8892a4]">Uptime </span>
                            <span className={uptime >= 99 ? "text-green-400" : uptime >= 95 ? "text-amber-400" : "text-red-400"}>
                              {uptime}%
                            </span>
                          </div>
                        )}
                        {avgMs !== null && (
                          <div>
                            <span className="text-[#8892a4]">Avg </span>
                            <span className="text-[#e8eaf0]">{formatMs(avgMs)}</span>
                          </div>
                        )}
                        {latest && (
                          <div className="flex items-center gap-1 text-[#8892a4] ml-auto">
                            <Clock className="h-3 w-3" />
                            {formatRelative(latest.checkedAt)}
                          </div>
                        )}
                      </div>

                      {/* Mini status bar */}
                      {results.length > 0 && (
                        <div className="flex gap-0.5 mt-3 h-1.5">
                          {results
                            .slice(0, 20)
                            .reverse()
                            .map((r, i) => (
                              <div
                                key={i}
                                className={`flex-1 rounded-full ${r.ok ? "bg-green-500/60" : "bg-red-500/60"}`}
                              />
                            ))}
                        </div>
                      )}
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {unmonitored.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider mb-3">
              Not Monitored ({unmonitored.length})
            </h2>
            <div className="rounded-lg border border-[#1e2535] bg-[#161b27] divide-y divide-[#1e2535]">
              {unmonitored.map((key) => (
                <Link
                  key={key.id}
                  href={`/keys/${key.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#1a2030]/40 transition-colors"
                >
                  <div>
                    <span className="text-sm text-[#e8eaf0]">{key.name}</span>
                    <span className="text-xs text-[#8892a4] ml-2">{key.provider}</span>
                  </div>
                  <span className="text-xs text-blue-400">Configure monitor →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
