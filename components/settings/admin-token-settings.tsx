"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Trash2, RefreshCw, UserRoundCog } from "lucide-react";
import { formatDate, formatRelative } from "@/lib/utils";

interface AdminToken {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  user: { id: string; name: string | null; email: string; status: string };
}

interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  status: string;
}

function tokenStatus(token: AdminToken): "active" | "revoked" | "expired" | "blocked" {
  if (token.revokedAt) return "revoked";
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return "expired";
  if (token.user.status !== "ACTIVE") return "blocked";
  return "active";
}

const STATUS_BADGE: Record<string, { variant: "success" | "danger" | "warning" | "muted"; label: string }> = {
  active:  { variant: "success", label: "Active" },
  revoked: { variant: "danger",  label: "Revoked" },
  expired: { variant: "danger",  label: "Expired" },
  blocked: { variant: "warning", label: "Blocked" },
};

function ReassignModal({
  token,
  users,
  onConfirm,
  onCancel,
}: {
  token: AdminToken;
  users: TeamUser[];
  onConfirm: (userId: string) => void;
  onCancel: () => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { selectRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setSaving(true);
    onConfirm(selectedUserId);
  };

  const otherUsers = users.filter((u) => u.id !== token.user.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-[#0f1117] border border-[#2a3447] rounded-lg p-5 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <UserRoundCog className="h-4 w-4 text-[#8892a4]" />
          <h3 className="text-sm font-semibold text-[#e8eaf0]">Reassign Token</h3>
        </div>
        <p className="text-xs text-[#8892a4] mb-4">
          Move <span className="text-[#e8eaf0]">{token.name}</span> to a different owner.
          Current owner: <span className="text-[#e8eaf0]">{token.user.name ?? token.user.email}</span>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#c8cdd6] block mb-1.5">New Owner</label>
            <select
              ref={selectRef}
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="h-9 w-full rounded-md border border-[#2a3447] bg-[#0d1018] px-3 text-sm text-[#e8eaf0] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a team member…</option>
              {otherUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} (${u.email})` : u.email}
                  {u.status !== "ACTIVE" ? ` — ${u.status.toLowerCase()}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-[#8892a4] hover:text-[#e8eaf0] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedUserId || saving}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md transition-colors"
            >
              {saving ? "Saving…" : "Reassign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminTokenSettings() {
  const [tokens, setTokens] = useState<AdminToken[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [reassigningToken, setReassigningToken] = useState<AdminToken | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [tokensRes, usersRes] = await Promise.all([
        fetch("/api/admin/access-tokens"),
        fetch("/api/admin/users"),
      ]);
      if (tokensRes.ok) setTokens(await tokensRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Revoke token "${name}"? Any tools using it will lose access immediately.`)) return;
    await fetch(`/api/admin/access-tokens/${id}`, { method: "DELETE" });
    setTokens((prev) => prev.map((t) => t.id === id ? { ...t, revokedAt: new Date().toISOString() } : t));
  };

  const handleReassign = async (userId: string) => {
    if (!reassigningToken) return;
    const res = await fetch(`/api/admin/access-tokens/${reassigningToken.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTokens((prev) => prev.map((t) =>
        t.id === reassigningToken.id ? { ...t, user: updated.user } : t
      ));
    }
    setReassigningToken(null);
  };

  const visible = tokens.filter((t) => {
    const s = tokenStatus(t);
    if (filter === "active") return s === "active";
    if (filter === "inactive") return s !== "active";
    return true;
  });

  const counts = {
    all: tokens.length,
    active: tokens.filter((t) => tokenStatus(t) === "active").length,
    inactive: tokens.filter((t) => tokenStatus(t) !== "active").length,
  };

  return (
    <>
      {reassigningToken && (
        <ReassignModal
          token={reassigningToken}
          users={users}
          onConfirm={handleReassign}
          onCancel={() => setReassigningToken(null)}
        />
      )}

      <Card>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#8892a4]" />
            <h3 className="text-sm font-semibold text-[#e8eaf0]">All Access Tokens</h3>
            <Badge variant="muted" className="text-[10px]">Admin</Badge>
          </div>
          <button onClick={load} disabled={loading} className="text-[10px] text-[#4a5568] hover:text-[#8892a4] transition-colors flex items-center gap-1">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <p className="text-xs text-[#8892a4] mb-4">
          Manage access tokens issued by all team members. Tokens from disabled accounts are automatically blocked.
        </p>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors capitalize ${
                filter === f
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-[#8892a4] hover:text-[#e8eaf0] border border-transparent"
              }`}
            >
              {f} <span className="text-[10px] opacity-60">({counts[f]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-xs text-[#4a5568] py-4 text-center">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-xs text-[#4a5568]">No tokens found.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#1e2535]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e2535] bg-[#0d1018]">
                  <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Token</th>
                  <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Owner</th>
                  <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Scopes</th>
                  <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Created</th>
                  <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Last Used</th>
                  <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Expires</th>
                  <th className="text-left px-3 py-2 text-[#4a5568] font-medium">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {visible.map((token) => {
                  const status = tokenStatus(token);
                  const { variant, label } = STATUS_BADGE[status];
                  const canRevoke = !token.revokedAt;
                  return (
                    <tr key={token.id} className="border-b border-[#1a2030] last:border-0 hover:bg-[#0f1420]">
                      <td className="px-3 py-2.5">
                        <span className="text-[#e8eaf0] font-medium">{token.name}</span>
                        <br />
                        <code className="text-[10px] text-[#4a5568] font-mono">{token.prefix}…</code>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[#8892a4]">{token.user.name ?? token.user.email}</span>
                        <br />
                        <span className="text-[10px] text-[#4a5568]">{token.user.name ? token.user.email : ""}</span>
                        {token.user.status !== "ACTIVE" && (
                          <Badge variant="warning" className="text-[9px] ml-1">
                            {token.user.status.toLowerCase()}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {token.scopes.split(",").map((s) => (
                            <code key={s} className="text-[10px] text-[#8892a4] font-mono">{s.trim()}</code>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[#8892a4] whitespace-nowrap">{formatDate(token.createdAt)}</td>
                      <td className="px-3 py-2.5 text-[#8892a4] whitespace-nowrap">
                        {token.lastUsedAt ? formatRelative(token.lastUsedAt) : <span className="text-[#4a5568]">Never</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[#8892a4] whitespace-nowrap">
                        {token.expiresAt
                          ? <span className={new Date(token.expiresAt) < new Date() ? "text-red-400" : ""}>{formatRelative(token.expiresAt)}</span>
                          : <span className="text-[#4a5568]">Never</span>
                        }
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={variant}>{label}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:text-blue-400"
                            onClick={() => setReassigningToken(token)}
                            title="Reassign to different owner"
                          >
                            <UserRoundCog className="h-3.5 w-3.5" />
                          </Button>
                          {canRevoke && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:text-red-400"
                              onClick={() => handleRevoke(token.id, token.name)}
                              title="Revoke token"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
