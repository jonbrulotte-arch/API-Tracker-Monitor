"use client";

import { useState, useEffect, FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export function NotificationSettings() {
  const [expiryWarningDays, setExpiryWarningDays] = useState(14);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/notifications/settings")
      .then((r) => r.json())
      .then((d) => setExpiryWarningDays(d.expiryWarningDays ?? 14));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiryWarningDays }),
      });
      setStatus(res.ok
        ? { type: "success", message: "Settings saved." }
        : { type: "error", message: "Failed to save." }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Bell className="h-4 w-4 text-[#8892a4]" />
        <h3 className="text-sm font-semibold text-[#e8eaf0]">Notification Settings</h3>
      </div>
      <p className="text-xs text-[#8892a4] mb-4">
        Global settings applied to all notification channels (Slack, Teams, Email).
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <p className="text-sm font-medium text-[#c8cdd6] mb-2">Key expiry warning</p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#8892a4]">Warn</span>
            <input
              type="number"
              min={1}
              max={90}
              value={expiryWarningDays}
              onChange={(e) => setExpiryWarningDays(Number(e.target.value))}
              className="w-16 h-9 rounded-md border border-[#2a3447] bg-[#0f1117] px-3 text-sm text-[#e8eaf0] text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-[#8892a4]">days before key expiry</span>
          </div>
          <p className="text-xs text-[#4a5568] mt-1.5">
            Applies to all channels. The scheduler checks once per day and sends at most one alert per key per day.
          </p>
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

        <Button type="submit" loading={saving}>Save</Button>
      </form>
    </Card>
  );
}
