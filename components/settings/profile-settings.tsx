"use client";

import { useState, FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, User, KeyRound } from "lucide-react";

interface ProfileSettingsProps {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export function ProfileSettings({ id, name, email, role }: ProfileSettingsProps) {
  const [newName, setNewName] = useState(name ?? "");
  const [newEmail, setNewEmail] = useState(email);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const roleVariant = role === "ADMIN" ? "info" : role === "SUB_ADMIN" ? "warning" : "muted";
  const roleLabel = role === "ADMIN" ? "Admin" : role === "SUB_ADMIN" ? "Sub-Admin" : "Member";

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (newPw && newPw !== confirmPw) {
      setStatus({ type: "error", message: "New passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      const patch: Record<string, string> = {};
      if (newName !== (name ?? "")) patch.name = newName;
      if (newEmail !== email) patch.email = newEmail;
      if (newPw) { patch.currentPassword = currentPw; patch.newPassword = newPw; }

      if (Object.keys(patch).length === 0) {
        setStatus({ type: "error", message: "No changes to save." });
        return;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === "string"
          ? data.error
          : Object.values(data.error ?? {}).flat().join("; ");
        setStatus({ type: "error", message: msg || "Failed to save." });
      } else {
        setStatus({ type: "success", message: "Profile updated. Sign out and back in for changes to take full effect." });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      }
    } finally {
      setSaving(false);
    }
  };

  void id; // available if needed

  return (
    <Card>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold flex-shrink-0">
          {(newName || email).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#e8eaf0] truncate">{name ?? "—"}</p>
          <p className="text-xs text-[#8892a4] truncate">{email}</p>
        </div>
        <Badge variant={roleVariant}>
          {role === "ADMIN" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
          {roleLabel}
        </Badge>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Identity */}
        <div>
          <p className="text-xs font-semibold text-[#4a5568] uppercase tracking-wider mb-3">Profile</p>
          <div className="space-y-3">
            <Input
              label="Display Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Your name"
            />
            <Input
              label="Email Address"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="pt-1 border-t border-[#1e2535]">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="h-3.5 w-3.5 text-[#4a5568]" />
            <p className="text-xs font-semibold text-[#4a5568] uppercase tracking-wider">Change Password</p>
          </div>
          <div className="space-y-3">
            <Input
              label="Current Password"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Leave blank to keep current"
              autoComplete="current-password"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="New Password"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min 8 characters"
                autoComplete="new-password"
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
          </div>
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

        <Button type="submit" loading={saving}>Save Changes</Button>
      </form>
    </Card>
  );
}
