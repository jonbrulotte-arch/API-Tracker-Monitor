"use client";

import { useState, useEffect, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, ChevronDown, ChevronUp } from "lucide-react";

interface NotifLogEntry {
  id: string;
  channel: string;
  type: string;
  keyName: string | null;
  provider: string | null;
  message: string;
  success: boolean;
  error: string | null;
  sentAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  monitor_failure: "Monitor Failure",
  monitor_recovered: "Monitor Recovered",
  key_expiry: "Key Expiry",
  key_added: "Key Added",
  key_removed: "Key Removed",
  test: "Test",
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-blue-600" : "bg-[#2a3447]"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${value ? "translate-x-4.5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function EmailSettings() {
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [notifyOnExpiry, setNotifyOnExpiry] = useState(true);
  const [notifyOnKeyAdd, setNotifyOnKeyAdd] = useState(true);
  const [notifyOnKeyRemove, setNotifyOnKeyRemove] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<NotifLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/email")
      .then((r) => r.json())
      .then((data) => {
        setSmtpHost(data.smtpHost ?? "");
        setSmtpPort(data.smtpPort ?? 587);
        setSmtpSecure(data.smtpSecure ?? false);
        setSmtpUser(data.smtpUser ?? "");
        setSmtpPass(data.smtpPass ?? "");
        setSmtpFrom(data.smtpFrom ?? "");
        setEmailTo(data.emailTo ?? "");
        setNotifyOnFailure(data.notifyOnFailure ?? true);
        setNotifyOnExpiry(data.notifyOnExpiry ?? true);
        setNotifyOnKeyAdd(data.notifyOnKeyAdd ?? true);
        setNotifyOnKeyRemove(data.notifyOnKeyRemove ?? true);
      });
  }, []);

  const fetchLog = async () => {
    setLogLoading(true);
    try {
      const res = await fetch("/api/notifications/log?channel=email");
      if (res.ok) setLogs(await res.json());
    } finally {
      setLogLoading(false);
    }
  };

  const toggleLog = async () => {
    const next = !showLog;
    setShowLog(next);
    if (next && logs.length === 0) await fetchLog();
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/notifications/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, emailTo,
          notifyOnFailure, notifyOnExpiry, notifyOnKeyAdd, notifyOnKeyRemove,
        }),
      });
      setStatus(res.ok ? { type: "success", message: "Settings saved." } : { type: "error", message: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/notifications/email", { method: "POST" });
      if (res.ok) {
        setStatus({ type: "success", message: "Test email sent! Check your inbox." });
        if (showLog) await fetchLog();
      } else {
        const d = await res.json();
        setStatus({ type: "error", message: d.error ?? "Test failed." });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-4 w-4 text-[#8892a4]" />
        <h3 className="text-sm font-semibold text-[#e8eaf0]">Email Notifications</h3>
        <Badge variant="muted" className="text-[10px]">SMTP</Badge>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="SMTP Host"
            placeholder="smtp.gmail.com"
            value={smtpHost}
            onChange={(e) => setSmtpHost(e.target.value)}
            className="col-span-2"
          />
          <Input
            label="Port"
            type="number"
            min={1}
            max={65535}
            value={smtpPort}
            onChange={(e) => setSmtpPort(Number(e.target.value))}
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => setSmtpSecure(!smtpSecure)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${smtpSecure ? "bg-blue-600" : "bg-[#2a3447]"}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${smtpSecure ? "translate-x-4.5" : "translate-x-0.5"}`} />
          </button>
          <span className="text-sm text-[#e8eaf0]">Use TLS (port 465)</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="SMTP Username"
            placeholder="user@example.com"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
          />
          <Input
            label="SMTP Password"
            type="password"
            placeholder="••••••••"
            value={smtpPass}
            onChange={(e) => setSmtpPass(e.target.value)}
          />
        </div>

        <Input
          label="From Address"
          placeholder="API Monitor <monitor@yourcompany.com>"
          value={smtpFrom}
          onChange={(e) => setSmtpFrom(e.target.value)}
          hint="The sender address shown in email clients"
        />

        <Input
          label="Send Notifications To"
          placeholder="admin@example.com, team@example.com"
          value={emailTo}
          onChange={(e) => setEmailTo(e.target.value)}
          hint="Comma-separated list of recipient addresses"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-[#c8cdd6]">Notify when</p>
          {[
            { label: "Monitor check fails", value: notifyOnFailure, set: setNotifyOnFailure },
            { label: "API key is expiring soon", value: notifyOnExpiry, set: setNotifyOnExpiry },
            { label: "API key is added", value: notifyOnKeyAdd, set: setNotifyOnKeyAdd },
            { label: "API key is removed", value: notifyOnKeyRemove, set: setNotifyOnKeyRemove },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-3 cursor-pointer">
              <Toggle value={value} onChange={set} />
              <span className="text-sm text-[#e8eaf0]">{label}</span>
            </label>
          ))}
        </div>

        {status && (
          <div className={`rounded-md px-3 py-2 text-sm border ${
            status.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {status.message}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button type="submit" loading={saving}>Save</Button>
          <Button
            type="button"
            variant="secondary"
            loading={testing}
            onClick={handleTest}
            disabled={!smtpHost || !emailTo}
          >
            <Send className="h-3.5 w-3.5" /> Send Test
          </Button>
          <Button type="button" variant="ghost" onClick={toggleLog} className="ml-auto">
            {showLog ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showLog ? "Hide Log" : "View Log"}
          </Button>
        </div>
      </form>

      {showLog && (
        <div className="mt-4 border-t border-[#1e2535] pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#c8cdd6]">Email Log</p>
            <button onClick={fetchLog} disabled={logLoading} className="text-[10px] text-[#4a5568] hover:text-[#8892a4]">
              {logLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {logs.length === 0 && !logLoading ? (
            <p className="text-xs text-[#4a5568]">No emails logged yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-[#1e2535]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1e2535] bg-[#0d1018]">
                    <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Time</th>
                    <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Type</th>
                    <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Key</th>
                    <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Subject</th>
                    <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[#1a2030] last:border-0">
                      <td className="px-3 py-2 font-mono text-[#8892a4] whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                      </td>
                      <td className="px-3 py-2 text-[#8892a4]">{TYPE_LABELS[log.type] ?? log.type}</td>
                      <td className="px-3 py-2 text-[#8892a4]">
                        {log.keyName ? <span>{log.keyName}{log.provider ? <span className="text-[#4a5568]"> · {log.provider}</span> : null}</span> : "—"}
                      </td>
                      <td className="px-3 py-2 text-[#8892a4] max-w-xs truncate" title={log.error ?? log.message}>
                        {log.error ? <span className="text-red-400">{log.error}</span> : log.message}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={log.success ? "success" : "danger"}>{log.success ? "Sent" : "Failed"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
