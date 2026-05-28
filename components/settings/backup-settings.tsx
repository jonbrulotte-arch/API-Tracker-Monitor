"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Download, Trash2, Upload, RefreshCw, Clock } from "lucide-react";

interface BackupEntry {
  id: string;
  filename: string;
  sizeBytes: number;
  encrypted: boolean;
  createdAt: string;
  createdBy: { name: string | null; email: string };
}

type Schedule = "disabled" | "daily" | "weekly" | "monthly";

const SCHEDULE_LABELS: Record<Schedule, string> = {
  disabled: "Disabled",
  daily: "Daily",
  weekly: "Weekly (Sundays)",
  monthly: "Monthly (1st)",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatHour(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${suffix} UTC`;
}

function nextRunLabel(schedule: Schedule, hour: number, lastRan: string | null): string {
  if (schedule === "disabled") return "—";
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hour, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

  if (schedule === "weekly") {
    while (next.getUTCDay() !== 0) next.setUTCDate(next.getUTCDate() + 1);
  } else if (schedule === "monthly") {
    next.setUTCDate(1);
    if (next <= now) next.setUTCMonth(next.getUTCMonth() + 1);
  }

  return next.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit",
    minute: "2-digit", hour12: true, timeZone: "UTC",
  }) + " UTC";
}

export function BackupSettings() {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [maxCount, setMaxCount] = useState(10);
  const [maxInput, setMaxInput] = useState("10");
  const [schedule, setSchedule] = useState<Schedule>("disabled");
  const [scheduleHour, setScheduleHour] = useState(2);
  const [lastRan, setLastRan] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [savingMax, setSavingMax] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Track original schedule values to show Save button only when changed
  const [origSchedule, setOrigSchedule] = useState<Schedule>("disabled");
  const [origHour, setOrigHour] = useState(2);
  const scheduleChanged = schedule !== origSchedule || scheduleHour !== origHour;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backup");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups);
        setMaxCount(data.maxCount);
        setMaxInput(String(data.maxCount));
        setSchedule(data.schedule ?? "disabled");
        setScheduleHour(data.scheduleHour ?? 2);
        setLastRan(data.lastRan ?? null);
        setOrigSchedule(data.schedule ?? "disabled");
        setOrigHour(data.scheduleHour ?? 2);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRun = async () => {
    setRunning(true);
    setStatus(null);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      if (res.ok) {
        setStatus({ type: "success", message: "Backup created successfully." });
        await load();
      } else {
        const d = await res.json();
        setStatus({ type: "error", message: d.error ?? "Backup failed." });
      }
    } finally {
      setRunning(false);
    }
  };

  const handleDownload = (backup: BackupEntry) => {
    window.location.href = `/api/backup?id=${backup.id}`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this backup? This cannot be undone.")) return;
    const res = await fetch(`/api/backup?id=${id}`, { method: "DELETE" });
    if (res.ok) setBackups((prev) => prev.filter((b) => b.id !== id));
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/backup/restore", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        setStatus({
          type: "success",
          message: `Restore complete — ${data.restored.apiKeys} keys, ${data.restored.monitorConfigs} monitors, ${data.restored.appSettings} settings restored.`,
        });
      } else {
        setStatus({ type: "error", message: data.error ?? "Restore failed." });
      }
    } finally {
      setRestoring(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSaveMax = async () => {
    setSavingMax(true);
    try {
      await fetch("/api/backup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxCount: Number(maxInput) }),
      });
      setMaxCount(Number(maxInput));
    } finally {
      setSavingMax(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const res = await fetch("/api/backup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule, scheduleHour }),
      });
      if (res.ok) {
        setOrigSchedule(schedule);
        setOrigHour(scheduleHour);
        setStatus({ type: "success", message: `Backup schedule saved — ${SCHEDULE_LABELS[schedule]}${schedule !== "disabled" ? ` at ${formatHour(scheduleHour)}` : ""}.` });
      }
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-4 w-4 text-[#8892a4]" />
        <h3 className="text-sm font-semibold text-[#e8eaf0]">Encrypted Backups</h3>
        <Badge variant="muted" className="text-[10px]">AES-256-GCM</Badge>
      </div>

      <p className="text-xs text-[#8892a4] mb-5">
        Backups include all API keys (with encrypted values), monitor configs, and app settings.
        Files are encrypted with the same key used to store your API keys — only restorable in
        an instance with the same <code className="text-blue-400">ENCRYPTION_KEY</code>.
      </p>

      {/* Schedule */}
      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-[#8892a4]" />
          <p className="text-sm font-medium text-[#c8cdd6]">Automatic Schedule</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["disabled", "daily", "weekly", "monthly"] as Schedule[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSchedule(opt)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                schedule === opt
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                  : "bg-[#1e2535] border-[#2a3447] text-[#8892a4] hover:text-[#e8eaf0] hover:border-[#3a4558]"
              }`}
            >
              {SCHEDULE_LABELS[opt]}
            </button>
          ))}
        </div>

        {schedule !== "disabled" && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#c8cdd6]">Run at</span>
            <select
              value={scheduleHour}
              onChange={(e) => setScheduleHour(Number(e.target.value))}
              className="h-9 rounded-md border border-[#2a3447] bg-[#0f1117] px-3 text-sm text-[#e8eaf0] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{formatHour(i)}</option>
              ))}
            </select>
          </div>
        )}

        {schedule !== "disabled" && (
          <div className="text-xs text-[#8892a4] space-y-0.5">
            {lastRan && (
              <p>Last auto-backup: <span className="text-[#e8eaf0]">
                {new Date(lastRan).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
              </span></p>
            )}
            <p>Next scheduled run: <span className="text-[#e8eaf0]">
              {nextRunLabel(schedule, scheduleHour, lastRan)}
            </span></p>
          </div>
        )}

        {scheduleChanged && (
          <Button type="button" variant="secondary" size="sm" loading={savingSchedule} onClick={handleSaveSchedule}>
            Save Schedule
          </Button>
        )}
      </div>

      {/* Retention */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-[#c8cdd6]">Keep</span>
        <input
          type="number"
          min={1}
          max={100}
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          className="w-16 h-9 rounded-md border border-[#2a3447] bg-[#0f1117] px-3 text-sm text-[#e8eaf0] text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-[#c8cdd6]">backups (oldest auto-deleted)</span>
        {maxInput !== String(maxCount) && (
          <Button type="button" variant="secondary" size="sm" loading={savingMax} onClick={handleSaveMax}>
            Save
          </Button>
        )}
      </div>

      {status && (
        <div className={`rounded-md px-3 py-2 text-sm border mb-4 ${
          status.type === "success"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {status.message}
        </div>
      )}

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Button type="button" loading={running} onClick={handleRun}>
          <RefreshCw className="h-3.5 w-3.5" /> Run Backup Now
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={restoring}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" /> Import & Restore
        </Button>
        <input ref={fileRef} type="file" accept=".enc" className="hidden" onChange={handleRestore} />
      </div>

      {/* Backup list */}
      {loading ? (
        <p className="text-xs text-[#4a5568]">Loading…</p>
      ) : backups.length === 0 ? (
        <p className="text-xs text-[#4a5568]">No backups yet. Click "Run Backup Now" to create one.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[#1e2535]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e2535] bg-[#0d1018]">
                <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Created</th>
                <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Size</th>
                <th className="text-left px-3 py-2 text-[#4a5568] font-medium">By</th>
                <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Enc</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} className="border-b border-[#1a2030] last:border-0 hover:bg-[#0f1117]/50">
                  <td className="px-3 py-2 font-mono text-[#8892a4] whitespace-nowrap">
                    {new Date(b.createdAt).toLocaleString("en-US", {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit", hour12: false,
                    })}
                  </td>
                  <td className="px-3 py-2 text-[#8892a4]">{formatBytes(b.sizeBytes)}</td>
                  <td className="px-3 py-2 text-[#8892a4]">{b.createdBy.name ?? b.createdBy.email}</td>
                  <td className="px-3 py-2">
                    {b.encrypted && <Badge variant="success" className="text-[10px]">AES-256</Badge>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleDownload(b)}
                        className="p-1.5 rounded hover:bg-[#1e2535] text-[#8892a4] hover:text-[#e8eaf0] transition-colors"
                        title="Download backup"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-[#4a5568] hover:text-red-400 transition-colors"
                        title="Delete backup"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
