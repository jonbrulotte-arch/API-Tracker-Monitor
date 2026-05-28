"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";

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

export function RegistrationSettings({ initialAllowRegistration }: { initialAllowRegistration: boolean }) {
  const [allowRegistration, setAllowRegistration] = useState(initialAllowRegistration);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleToggle = async (value: boolean) => {
    setAllowRegistration(value);
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings/app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowRegistration: value }),
      });
      if (res.ok) {
        setStatus({
          type: "success",
          message: value ? "Registration is now open." : "Registration is now closed.",
        });
      } else {
        setAllowRegistration(!value);
        setStatus({ type: "error", message: "Failed to update setting." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-4 w-4 text-[#8892a4]" />
        <h3 className="text-sm font-semibold text-[#e8eaf0]">User Registration</h3>
      </div>

      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm text-[#e8eaf0]">Allow new registrations</p>
          <p className="text-xs text-[#8892a4] mt-0.5">
            When off, the /register page shows a &quot;Registration closed&quot; message and the API rejects new accounts
          </p>
        </div>
        <Toggle value={allowRegistration} onChange={saving ? () => {} : handleToggle} />
      </div>

      {status && (
        <div className={`mt-3 rounded-md px-3 py-2 text-sm border ${
          status.type === "success"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {status.message}
        </div>
      )}
    </Card>
  );
}
