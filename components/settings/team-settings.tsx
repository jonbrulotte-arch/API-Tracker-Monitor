"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Check, Ban, ChevronDown, Pencil, X, ArrowRightLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  keyCount: number;
}

interface TeamSettingsProps {
  currentUserId: string;
  currentUserRole: string;
}

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "muted"> = {
  ACTIVE: "success",
  PENDING: "warning",
  DISABLED: "danger",
};

const ROLE_VARIANTS: Record<string, "info" | "muted" | "warning"> = {
  ADMIN: "info",
  SUB_ADMIN: "warning",
  MEMBER: "muted",
};

export function TeamSettings({ currentUserId, currentUserRole }: TeamSettingsProps) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignStatus, setReassignStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const isAdmin = currentUserRole === "ADMIN";

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const update = async (userId: string, patch: { status?: string; role?: string; name?: string; email?: string }) => {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      }
    } finally {
      setUpdating(null);
    }
  };

  const startEdit = (u: TeamUser) => {
    setEditing(u.id);
    setEditName(u.name ?? "");
    setEditEmail(u.email);
  };

  const saveEdit = async (userId: string) => {
    await update(userId, { name: editName, email: editEmail });
    setEditing(null);
  };

  const openReassign = (userId: string) => {
    setReassigning(userId);
    setReassignTo("");
    setReassignStatus(null);
  };

  const handleReassign = async (fromUserId: string) => {
    if (!reassignTo) return;
    setReassignLoading(true);
    setReassignStatus(null);
    try {
      const res = await fetch(`/api/admin/users/${fromUserId}/reassign-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: reassignTo }),
      });
      const data = await res.json();
      if (res.ok) {
        setReassignStatus({ type: "success", message: `${data.count} key${data.count !== 1 ? "s" : ""} reassigned.` });
        await fetchUsers();
      } else {
        setReassignStatus({ type: "error", message: data.error ?? "Reassignment failed." });
      }
    } finally {
      setReassignLoading(false);
    }
  };

  const pendingCount = users.filter((u) => u.status === "PENDING").length;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-[#8892a4]" />
        <h3 className="text-sm font-semibold text-[#e8eaf0]">
          Team Members ({users.length})
        </h3>
        {pendingCount > 0 && (
          <Badge variant="warning" className="text-[10px]">{pendingCount} pending</Badge>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-[#4a5568]">Loading…</p>
      ) : (
        <div className="divide-y divide-[#1e2535]">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const canModify = !isSelf && (
              isAdmin || (currentUserRole === "SUB_ADMIN" && u.role === "MEMBER")
            );
            const isReassigning = reassigning === u.id;
            const activeOtherUsers = users.filter((x) => x.id !== u.id && x.status === "ACTIVE");

            return (
              <div key={u.id} className="py-3 space-y-2">
                {editing === u.id ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      className="h-7 rounded border border-[#2a3447] bg-[#0f1117] px-2 text-xs text-[#e8eaf0] focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                    />
                    <input
                      className="h-7 rounded border border-[#2a3447] bg-[#0f1117] px-2 text-xs text-[#e8eaf0] focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Email"
                      type="email"
                    />
                    <Button size="sm" variant="secondary" loading={updating === u.id} onClick={() => saveEdit(u.id)}>
                      <Check className="h-3 w-3 text-green-400" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-[#e8eaf0] truncate">{u.name ?? u.email}</p>
                      {isSelf && <span className="text-[10px] text-[#4a5568]">(you)</span>}
                    </div>
                    {u.name && <p className="text-xs text-[#4a5568] truncate">{u.email}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-[#4a5568]">Joined {formatDate(new Date(u.createdAt))}</p>
                      {u.keyCount > 0 && (
                        <span className="text-[11px] text-[#4a5568]">· {u.keyCount} key{u.keyCount !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <Badge variant={STATUS_VARIANTS[u.status] ?? "muted"} className="text-[10px]">
                      {u.status}
                    </Badge>
                    <Badge variant={ROLE_VARIANTS[u.role] ?? "muted"} className="text-[10px]">
                      {u.role}
                    </Badge>

                    <div className="flex items-center gap-1 flex-wrap">
                      {isAdmin && editing !== u.id && (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(u)} title="Edit name/email">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {isAdmin && !isSelf && u.keyCount > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => isReassigning ? setReassigning(null) : openReassign(u.id)}
                          title="Reassign keys to another team member"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                        </Button>
                      )}
                      {canModify && (
                        <>
                          {u.status === "PENDING" && (
                            <Button size="sm" variant="secondary" loading={updating === u.id} onClick={() => update(u.id, { status: "ACTIVE" })}>
                              <Check className="h-3.5 w-3.5 text-green-400" />
                              <span className="text-xs">Approve</span>
                            </Button>
                          )}
                          {u.status === "ACTIVE" && (
                            <Button size="sm" variant="secondary" loading={updating === u.id} onClick={() => update(u.id, { status: "DISABLED" })}>
                              <Ban className="h-3.5 w-3.5 text-red-400" />
                              <span className="text-xs">Disable</span>
                            </Button>
                          )}
                          {u.status === "DISABLED" && (
                            <Button size="sm" variant="secondary" loading={updating === u.id} onClick={() => update(u.id, { status: "ACTIVE" })}>
                              <Check className="h-3.5 w-3.5 text-green-400" />
                              <span className="text-xs">Enable</span>
                            </Button>
                          )}
                          {isAdmin && u.role !== "ADMIN" && (
                            <RoleMenu currentRole={u.role} onSelect={(role) => update(u.id, { role })} disabled={updating === u.id} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline reassignment panel */}
                {isReassigning && (
                  <div className="ml-0 mt-1 rounded-md border border-[#2a3447] bg-[#0d1018] p-3 space-y-2">
                    <p className="text-xs text-[#8892a4]">
                      Transfer all {u.keyCount} key{u.keyCount !== 1 ? "s" : ""} owned by <span className="text-[#e8eaf0]">{u.name ?? u.email}</span> to:
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={reassignTo}
                        onChange={(e) => setReassignTo(e.target.value)}
                        className="h-8 rounded-md border border-[#2a3447] bg-[#0f1117] px-2 text-xs text-[#e8eaf0] focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 min-w-[160px]"
                      >
                        <option value="">Select new owner…</option>
                        {activeOtherUsers.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name ?? x.email}{x.name ? ` (${x.email})` : ""}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        loading={reassignLoading}
                        disabled={!reassignTo}
                        onClick={() => handleReassign(u.id)}
                      >
                        Transfer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReassigning(null)}>
                        Cancel
                      </Button>
                    </div>
                    {reassignStatus && (
                      <p className={`text-xs ${reassignStatus.type === "success" ? "text-green-400" : "text-red-400"}`}>
                        {reassignStatus.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function RoleMenu({ currentRole, onSelect, disabled }: {
  currentRole: string;
  onSelect: (role: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const options = currentRole === "MEMBER"
    ? [{ label: "Make Sub-Admin", value: "SUB_ADMIN" }]
    : [{ label: "Demote to Member", value: "MEMBER" }];

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOpen(!open)}
        disabled={disabled}
      >
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-md border border-[#2a3447] bg-[#161b27] shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              className="w-full text-left px-3 py-2 text-xs text-[#8892a4] hover:bg-[#1e2535] hover:text-[#e8eaf0] transition-colors"
              onClick={() => { onSelect(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
