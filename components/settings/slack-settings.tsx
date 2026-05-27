"use client";

import { useState, useEffect, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface SlackLogEntry {
  id: string;
  type: string;
  keyName: string | null;
  provider: string | null;
  message: string;
  success: boolean;
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

const TYPE_LABELS_EXTRA: Record<string, string> = {
  key_added: "Key Added",
  key_removed: "Key Removed",
};

export function SlackSettings() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [notifyOnExpiry, setNotifyOnExpiry] = useState(true);
  const [expiryWarningDays, setExpiryWarningDays] = useState(14);
  const [notifyOnKeyAdd, setNotifyOnKeyAdd] = useState(true);
  const [notifyOnKeyRemove, setNotifyOnKeyRemove] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [forceChecking, setForceChecking] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<SlackLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/slack")
      .then((r) => r.json())
      .then((data) => {
        setWebhookUrl(data.webhookUrl ?? "");
        setNotifyOnFailure(data.notifyOnFailure ?? true);
        setNotifyOnExpiry(data.notifyOnExpiry ?? true);
        setExpiryWarningDays(data.expiryWarningDays ?? 14);
        setNotifyOnKeyAdd(data.notifyOnKeyAdd ?? true);
        setNotifyOnKeyRemove(data.notifyOnKeyRemove ?? true);
      });
  }, []);

  const fetchLog = async () => {
    setLogLoading(true);
    try {
      const res = await fetch("/api/notifications/slack/log");
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
      const res = await fetch("/api/notifications/slack", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl, notifyOnFailure, notifyOnExpiry, expiryWarningDays, notifyOnKeyAdd, notifyOnKeyRemove }),
      });
      if (res.ok) setStatus({ type: "success", message: "Settings saved." });
      else setStatus({ type: "error", message: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/notifications/slack", { method: "POST" });
      if (res.ok) {
        setStatus({ type: "success", message: "Test message sent! Check your Slack channel." });
        if (showLog) await fetchLog();
      } else {
        const d = await res.json();
        setStatus({ type: "error", message: d.error ?? "Test failed." });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleForceCheck = async () => {
    setForceChecking(true);
    setStatus(null);
    try {
      const res = await fetch("/api/notifications/slack/check", { method: "POST" });
      if (res.ok) {
        setStatus({ type: "success", message: "Expiry check complete — alerts sent for any keys within the warning window." });
        if (showLog) await fetchLog();
      } else {
        const d = await res.json();
        setStatus({ type: "error", message: d.error ?? "Check failed." });
      }
    } finally {
      setForceChecking(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-4 w-4 text-[#8892a4]" />
        <h3 className="text-sm font-semibold text-[#e8eaf0]">Slack Notifications</h3>
        <Badge variant="muted" className="text-[10px]">Webhook</Badge>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Input
          label="Incoming Webhook URL"
          type="url"
          placeholder="https://hooks.slack.com/services/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          hint="Create one at api.slack.com/messaging/webhooks"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-[#c8cdd6]">Notify when</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setNotifyOnFailure(!notifyOnFailure)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                notifyOnFailure ? "bg-blue-600" : "bg-[#2a3447]"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                notifyOnFailure ? "translate-x-4.5" : "translate-x-0.5"
              }`} />
            </button>
            <span className="text-sm text-[#e8eaf0]">Monitor check fails</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setNotifyOnExpiry(!notifyOnExpiry)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                notifyOnExpiry ? "bg-blue-600" : "bg-[#2a3447]"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                notifyOnExpiry ? "translate-x-4.5" : "translate-x-0.5"
              }`} />
            </button>
            <span className="text-sm text-[#e8eaf0]">API key is expiring soon</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setNotifyOnKeyAdd(!notifyOnKeyAdd)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                notifyOnKeyAdd ? "bg-blue-600" : "bg-[#2a3447]"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                notifyOnKeyAdd ? "translate-x-4.5" : "translate-x-0.5"
              }`} />
            </button>
            <span className="text-sm text-[#e8eaf0]">API key is added</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setNotifyOnKeyRemove(!notifyOnKeyRemove)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                notifyOnKeyRemove ? "bg-blue-600" : "bg-[#2a3447]"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                notifyOnKeyRemove ? "translate-x-4.5" : "translate-x-0.5"
              }`} />
            </button>
            <span className="text-sm text-[#e8eaf0]">API key is removed</span>
          </label>
        </div>

        {notifyOnExpiry && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#c8cdd6]">Warn</span>
            <input
              type="number"
              min={1}
              max={90}
              value={expiryWarningDays}
              onChange={(e) => setExpiryWarningDays(Number(e.target.value))}
              className="w-16 h-9 rounded-md border border-[#2a3447] bg-[#0f1117] px-3 text-sm text-[#e8eaf0] text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-[#c8cdd6]">days before expiry</span>
          </div>
        )}

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
            disabled={!webhookUrl}
          >
            <Send className="h-3.5 w-3.5" /> Send Test
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={forceChecking}
            onClick={handleForceCheck}
            disabled={!webhookUrl}
            title="Run expiry check now and send any due alerts"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Force Check
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={toggleLog}
            className="ml-auto"
          >
            {showLog ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showLog ? "Hide Log" : "View Log"}
          </Button>
        </div>
      </form>

      {/* Notification log */}
      {showLog && (
        <div className="mt-4 border-t border-[#1e2535] pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#c8cdd6]">Notification Log</p>
            <button
              onClick={fetchLog}
              disabled={logLoading}
              className="text-[10px] text-[#4a5568] hover:text-[#8892a4] transition-colors"
            >
              {logLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {logs.length === 0 && !logLoading ? (
            <p className="text-xs text-[#4a5568]">No messages logged yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-[#1e2535]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1e2535] bg-[#0d1018]">
                    <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Time</th>
                    <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Type</th>
                    <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Key</th>
                    <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Message</th>
                    <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[#1a2030] last:border-0">
                      <td className="px-3 py-2 font-mono text-[#8892a4] whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString("en-US", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
                        })}
                      </td>
                      <td className="px-3 py-2 text-[#8892a4] whitespace-nowrap">
                        {TYPE_LABELS[log.type] ?? log.type}
                      </td>
                      <td className="px-3 py-2 text-[#8892a4]">
                        {log.keyName ? (
                          <span>{log.keyName}{log.provider ? <span className="text-[#4a5568]"> · {log.provider}</span> : null}</span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-[#8892a4] max-w-xs truncate" title={log.message}>
                        {log.message}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={log.success ? "success" : "danger"}>
                          {log.success ? "Sent" : "Failed"}
                        </Badge>
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
