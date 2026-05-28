"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface UptimeChartProps {
  results: {
    checkedAt: string | Date;
    ok: boolean;
    responseMs: number | null;
    statusCode: number | null;
  }[];
}

export function UptimeChart({ results }: UptimeChartProps) {
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-[#8892a4]">
        No monitor data yet
      </div>
    );
  }

  const data = results
    .slice()
    .reverse()
    .map((r) => ({
      time: new Date(r.checkedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      responseMs: r.responseMs ?? 0,
      status: r.ok ? 1 : 0,
      statusCode: r.statusCode,
    }));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[#8892a4] mb-2">Response Time (ms)</p>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="responseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "#8892a4" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: "#8892a4" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#161b27", border: "1px solid #1e2535", borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: "#8892a4" }}
              itemStyle={{ color: "#e8eaf0" }}
            />
            <Area
              type="monotone"
              dataKey="responseMs"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fill="url(#responseGrad)"
              dot={false}
              name="Response (ms)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs text-[#8892a4] mb-2">Status (1 = OK, 0 = Fail)</p>
        <div className="flex gap-0.5 h-8">
          {data.slice(-60).map((d, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${d.status ? "bg-green-500/70" : "bg-red-500/70"}`}
              title={`${d.time} — ${d.status ? "OK" : "FAIL"}${d.statusCode ? ` (${d.statusCode})` : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
