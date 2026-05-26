"use client";

import { useState, useEffect, FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff } from "lucide-react";
import { formatDate, formatRelative } from "@/lib/utils";

interface AccessToken {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function AccessTokenSettings() {
  const [tokens, setTokens] = useState<AccessToken[]>([]);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [formName, setFormName] = useState("");
  const [formScopes, setFormScopes] = useState<string[]>(["read:keys"]);
  const [formExpiry, setFormExpiry] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/access-tokens")
      .then((r) => r.json())
      .then(setTokens);
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/access-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          scopes: formScopes,
          expiresAt: formExpiry ? new Date(formExpiry).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewToken(data.token);
        setFormOpen(false);
        setFormName("");
        setFormScopes(["read:keys"]);
        setFormExpiry("");
        // Refresh list
        const updated = await fetch("/api/access-tokens").then((r) => r.json());
        setTokens(updated);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this token? Any tools using it will lose access immediately.")) return;
    await fetch(`/api/access-tokens/${id}`, { method: "DELETE" });
    setTokens((t) => t.filter((tok) => tok.id !== id));
  };

  const handleCopy = async () => {
    if (!newToken) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(newToken);
      } else {
        // Fallback for non-HTTPS / LAN access
        const el = document.createElement("textarea");
        el.value = newToken;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed silently — token is visible on screen
    }
  };

  const toggleScope = (scope: string) => {
    setFormScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-[#8892a4]" />
          <h3 className="text-sm font-semibold text-[#e8eaf0]">API Access Tokens</h3>
          <Badge variant="muted" className="text-[10px]">External Access</Badge>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setFormOpen(!formOpen)}>
          <Plus className="h-3.5 w-3.5" /> New Token
        </Button>
      </div>

      <p className="text-xs text-[#8892a4] mb-4">
        Issue tokens for external tools to fetch key values via{" "}
        <code className="font-mono text-blue-400 text-[11px]">GET /api/v1/keys/:name</code>.
        Tokens are hashed — only shown once at creation.
      </p>

      {/* New token form */}
      {formOpen && (
        <form onSubmit={handleCreate} className="mb-4 p-4 rounded-md border border-[#2a3447] bg-[#0f1117] space-y-3">
          <Input
            label="Token Name"
            placeholder="e.g. CI/CD Pipeline, Deployment Script"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />
          <div>
            <p className="text-sm font-medium text-[#c8cdd6] mb-2">Scopes</p>
            <div className="space-y-1.5">
              {(["read:keys", "read:metadata"] as const).map((scope) => (
                <label key={scope} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-[#2a3447] bg-[#0f1117] text-blue-600"
                  />
                  <span className="text-sm text-[#e8eaf0] font-mono">{scope}</span>
                  <span className="text-xs text-[#8892a4]">
                    {scope === "read:keys" ? "— decrypt & return key values" : "— names, providers, expiry only"}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <Input
            label="Expires At (optional)"
            type="date"
            value={formExpiry}
            onChange={(e) => setFormExpiry(e.target.value)}
            hint="Leave blank for non-expiring token"
          />
          <div className="flex gap-2">
            <Button type="submit" loading={loading} disabled={formScopes.length === 0}>
              Create Token
            </Button>
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Newly created token — show once */}
      {newToken && (
        <div className="mb-4 p-4 rounded-md border border-green-500/30 bg-green-500/5">
          <p className="text-xs font-semibold text-green-400 mb-2">
            Token created — copy it now. It will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-green-300 bg-[#0f1117] rounded px-3 py-2 overflow-hidden">
              {showToken ? newToken : "atm_" + "•".repeat(40)}
            </code>
            <button
              onClick={() => setShowToken(!showToken)}
              className="p-1.5 rounded text-[#8892a4] hover:text-[#e8eaf0] hover:bg-[#1e2535]"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded text-[#8892a4] hover:text-green-400 hover:bg-[#1e2535] transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 text-xs"
            onClick={() => setNewToken(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Token list */}
      {tokens.length === 0 ? (
        <p className="text-xs text-[#8892a4]">No access tokens yet.</p>
      ) : (
        <div className="divide-y divide-[#1e2535]">
          {tokens.map((token) => {
            const expired = token.expiresAt && new Date(token.expiresAt) < new Date();
            return (
              <div key={token.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-[#e8eaf0]">{token.name}</span>
                    <code className="text-[11px] font-mono text-[#8892a4] bg-[#1e2535] px-1.5 py-0.5 rounded">
                      {token.prefix}…
                    </code>
                    {token.scopes.split(",").map((s) => (
                      <Badge key={s} variant="muted" className="text-[10px]">{s.trim()}</Badge>
                    ))}
                    {expired && <Badge variant="danger" className="text-[10px]">Expired</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#4a5568]">
                    <span>Created {formatDate(token.createdAt)}</span>
                    {token.lastUsedAt && <span>Last used {formatRelative(token.lastUsedAt)}</span>}
                    {token.expiresAt && !expired && <span>Expires {formatRelative(token.expiresAt)}</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:text-red-400 flex-shrink-0"
                  onClick={() => handleRevoke(token.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* API Usage example */}
      <div className="mt-4 pt-4 border-t border-[#1e2535]">
        <p className="text-xs font-medium text-[#8892a4] mb-2">Usage Example</p>
        <pre className="text-[11px] font-mono text-[#8892a4] bg-[#0f1117] rounded p-3 overflow-x-auto">
          {`# Fetch a single key by name\ncurl -H "Authorization: Bearer atm_..." \\\n  ${typeof window !== "undefined" ? window.location.origin : "https://your-app.com"}/api/v1/keys/OpenAI%20Production\n\n# List all keys\ncurl -H "Authorization: Bearer atm_..." \\\n  ${typeof window !== "undefined" ? window.location.origin : "https://your-app.com"}/api/v1/keys?reveal=true`}
        </pre>
      </div>
    </Card>
  );
}
