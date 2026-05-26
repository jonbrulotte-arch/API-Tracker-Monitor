"use client";

import { useState, useEffect, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Send } from "lucide-react";

export function SlackSettings() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [notifyOnExpiry, setNotifyOnExpiry] = useState(true);
  const [expiryWarningDays, setExpiryWarningDays] = useState(14);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/notifications/slack")
      .then((r) => r.json())
      .then((data) => {
        setWebhookUrl(data.webhookUrl ?? "");
        setNotifyOnFailure(data.notifyOnFailure ?? true);
        setNotifyOnExpiry(data.notifyOnExpiry ?? true);
        setExpiryWarningDays(data.expiryWarningDays ?? 14);
      });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/notifications/slack", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl, notifyOnFailure, notifyOnExpiry, expiryWarningDays }),
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
      if (res.ok) setStatus({ type: "success", message: "Test message sent! Check your Slack channel." });
      else {
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
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  notifyOnFailure ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
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
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  notifyOnExpiry ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-sm text-[#e8eaf0]">API key is expiring soon</span>
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
          <div
            className={`rounded-md px-3 py-2 text-sm border ${
              status.type === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="flex items-center gap-2">
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
        </div>
      </form>
    </Card>
  );
}
