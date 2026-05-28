"use client";

import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppWindow } from "lucide-react";

export function AppNameSettings({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings/app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName: name }),
      });
      if (res.ok) {
        setStatus({ type: "success", message: "App name saved. Reload the page to see the change." });
      } else {
        const d = await res.json();
        setStatus({ type: "error", message: d.error ?? "Failed to save." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <AppWindow className="h-4 w-4 text-[#8892a4]" />
        <h3 className="text-sm font-semibold text-[#e8eaf0]">App Name</h3>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Input
          label="Display Name"
          placeholder="API Monitor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="Shown in the sidebar, login page, and notification emails"
        />

        {status && (
          <div className={`rounded-md px-3 py-2 text-sm border ${
            status.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {status.message}
          </div>
        )}

        <Button type="submit" loading={saving} disabled={!name.trim()}>Save</Button>
      </form>
    </Card>
  );
}
