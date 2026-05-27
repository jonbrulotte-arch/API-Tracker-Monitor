"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelative, getExpiryStatus, formatMs } from "@/lib/utils";
import { Edit, Trash2, Eye, Activity, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ApiKeyWithRelations } from "@/types";

interface KeysTableProps {
  keys: ApiKeyWithRelations[];
}

const expiryBadge = (key: ApiKeyWithRelations) => {
  const s = getExpiryStatus(key.expiresAt);
  if (s === "none") return <span className="text-xs text-[#8892a4]">No expiry</span>;
  if (s === "expired") return <Badge variant="danger">Expired {formatRelative(key.expiresAt)}</Badge>;
  if (s === "critical") return <Badge variant="danger" dot>Expires {formatRelative(key.expiresAt)}</Badge>;
  if (s === "warning") return <Badge variant="warning" dot>Expires {formatRelative(key.expiresAt)}</Badge>;
  return <Badge variant="success" dot>{formatDate(key.expiresAt)}</Badge>;
};

const monitorBadge = (key: ApiKeyWithRelations) => {
  if (!key.monitorConfig) return <Badge variant="muted">No monitor</Badge>;
  if (!key.monitorConfig.enabled) return <Badge variant="muted">Disabled</Badge>;
  const latest = key.monitorResults[0];
  if (!latest) return <Badge variant="muted">Pending</Badge>;
  const uptime = key.monitorResults.filter((r) => r.ok).length / key.monitorResults.length * 100;
  if (latest.ok) return <Badge variant="success" dot>{Math.round(uptime)}% up</Badge>;
  return <Badge variant="danger" dot>Failing</Badge>;
};

export function KeysTable({ keys }: KeysTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"name" | "provider" | "expiresAt" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const sorted = [...keys]
    .filter(
      (k) =>
        k.name.toLowerCase().includes(search.toLowerCase()) ||
        k.provider.toLowerCase().includes(search.toLowerCase()) ||
        JSON.parse(k.tags).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "name") { av = a.name; bv = b.name; }
      if (sortKey === "provider") { av = a.provider; bv = b.provider; }
      if (sortKey === "expiresAt") { av = a.expiresAt?.getTime() ?? Infinity; bv = b.expiresAt?.getTime() ?? Infinity; }
      if (sortKey === "createdAt") { av = a.createdAt.getTime(); bv = b.createdAt.getTime(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
    ) : null;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this API key? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/keys/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  };

  if (keys.length === 0) {
    return (
      <div className="rounded-lg border border-[#1e2535] bg-[#161b27] p-12 text-center">
        <p className="text-sm text-[#8892a4]">No API keys yet.</p>
        <p className="text-xs text-[#4a5568] mt-1">Add your first key to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1e2535] bg-[#161b27] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e2535]">
        <input
          type="search"
          placeholder="Search by name, provider, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full max-w-xs rounded-md border border-[#2a3447] bg-[#0f1117] px-3 text-xs text-[#e8eaf0] placeholder:text-[#4a5568] focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e2535] text-xs text-[#8892a4]">
              <Th onClick={() => toggleSort("name")} className="pl-4">
                Name <SortIcon k="name" />
              </Th>
              <Th onClick={() => toggleSort("provider")}>
                Provider <SortIcon k="provider" />
              </Th>
              <Th>Key</Th>
              <Th onClick={() => toggleSort("expiresAt")}>
                Expiry <SortIcon k="expiresAt" />
              </Th>
              <Th>Monitor</Th>
              <Th>Latency</Th>
              <Th>Tags</Th>
              <Th className="pr-4 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((key) => {
              const tags: string[] = JSON.parse(key.tags);
              const latestResult = key.monitorResults[0];
              return (
                <tr
                  key={key.id}
                  className="border-b border-[#1a2030] last:border-0 hover:bg-[#1a2030]/40 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[#e8eaf0]">
                    <Link href={`/keys/${key.id}`} className="hover:text-blue-400 transition-colors">
                      {key.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#8892a4]">{key.provider}</td>
                  <td className="px-4 py-3">
                    <KeyReveal keyId={key.id} />
                  </td>
                  <td className="px-4 py-3">{expiryBadge(key)}</td>
                  <td className="px-4 py-3">{monitorBadge(key)}</td>
                  <td className="px-4 py-3 text-xs text-[#8892a4] font-mono">
                    {formatMs(latestResult?.responseMs)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <Badge key={t} variant="muted" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/keys/${key.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Activity className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/keys/${key.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:text-red-400"
                        loading={deleting === key.id}
                        onClick={() => handleDelete(key.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <div className="p-8 text-center text-xs text-[#8892a4]">No results match your search.</div>
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-left font-medium cursor-pointer select-none ${className ?? ""}`}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">{children}</span>
    </th>
  );
}

function PasswordModal({ onConfirm, onCancel }: { onConfirm: (pw: string) => void; onCancel: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (data.valid) {
        onConfirm(pw);
      } else {
        setError("Incorrect password.");
        setPw("");
        inputRef.current?.focus();
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-[#0f1117] border border-[#2a3447] rounded-lg p-5 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-[#8892a4]" />
          <h3 className="text-sm font-semibold text-[#e8eaf0]">Confirm your password</h3>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            ref={inputRef}
            type="password"
            placeholder="Enter your password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="h-9 w-full rounded-md border border-[#2a3447] bg-[#0d1018] px-3 text-sm text-[#e8eaf0] placeholder:text-[#4a5568] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-[#8892a4] hover:text-[#e8eaf0] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!pw || checking} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md transition-colors">
              {checking ? "Checking…" : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function KeyReveal({ keyId }: { keyId: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const doReveal = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/keys/${keyId}/reveal`);
      const data = await res.json();
      setValue(data.value);
      setVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRevealClick = () => {
    if (value) { setVisible(!visible); return; }
    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async () => {
    setShowPasswordModal(false);
    await doReveal();
  };

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for non-HTTPS contexts
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    return Promise.resolve();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!value) return;
    e.preventDefault();
    copyToClipboard(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
    fetch(`/api/keys/${keyId}/copy`, { method: "POST" }).catch(() => {});
  };

  if (!visible || !value) {
    return (
      <>
        {showPasswordModal && (
          <PasswordModal
            onConfirm={handlePasswordConfirm}
            onCancel={() => setShowPasswordModal(false)}
          />
        )}
        <button
          onClick={handleRevealClick}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-[#4a5568] hover:text-[#8892a4] transition-colors font-mono"
        >
          <Eye className="h-3 w-3" />
          {loading ? "..." : "••••••••"}
        </button>
      </>
    );
  }

  return (
    <button
      onClick={() => setVisible(false)}
      onContextMenu={handleContextMenu}
      className="font-mono text-xs text-green-400 hover:text-green-300 max-w-[180px] truncate block transition-colors"
      title={copied ? "Copied!" : value}
    >
      {copied ? <span className="text-blue-400">Copied!</span> : value}
    </button>
  );
}
