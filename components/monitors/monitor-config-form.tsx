"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayCircle, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMs } from "@/lib/utils";

interface MonitorConfigFormProps {
  keyId: string;
  canWrite?: boolean;
  config?: {
    endpoint: string;
    method: string;
    injectionType: string;
    injectionKey: string;
    injectionFormat: string | null;
    expectedStatus: number;
    intervalMinutes: number;
    enabled: boolean;
  } | null;
}

export function MonitorConfigForm({ keyId, config, canWrite = true }: MonitorConfigFormProps) {
  const router = useRouter();
  const [endpoint, setEndpoint] = useState(config?.endpoint ?? "");
  const [method, setMethod] = useState(config?.method ?? "GET");
  const [injectionType, setInjectionType] = useState(config?.injectionType ?? "header");
  const [injectionKey, setInjectionKey] = useState(config?.injectionKey ?? "Authorization");
  const [injectionFormat, setInjectionFormat] = useState(config?.injectionFormat ?? "Bearer {key}");
  const [expectedStatus, setExpectedStatus] = useState(config?.expectedStatus ?? 200);
  const [intervalMinutes, setIntervalMinutes] = useState(config?.intervalMinutes ?? 15);
  const [enabled, setEnabled] = useState(config?.enabled ?? true);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; statusCode?: number; responseMs?: number; errorMessage?: string } | null>(null);
  const [error, setError] = useState("");

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/keys/${keyId}/monitor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          method,
          injectionType,
          injectionKey,
          injectionFormat: injectionType === "header" || injectionType === "custom" ? injectionFormat : null,
          expectedStatus,
          intervalMinutes,
          enabled,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(typeof d.error === "string" ? d.error : "Failed to save");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/keys/${keyId}/check`, { method: "POST" });
      const data = await res.json();
      setTestResult(data);
      router.refresh();
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove monitor config and all check history for this key?")) return;
    await fetch(`/api/keys/${keyId}/monitor`, { method: "DELETE" });
    router.push(`/keys/${keyId}`);
  };

  const injectionHints: Record<string, string> = {
    header: 'Header name (e.g. "Authorization"). Format: "Bearer {key}" or just "{key}".',
    query: 'Query param name (e.g. "api_key"). Key appended as ?api_key=VALUE.',
    body: 'JSON body field name (e.g. "key"). Sends {"key": "VALUE"}.',
    custom: 'Header name. Format is the full header value, use {key} as placeholder.',
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {!canWrite && (
        <div className="rounded-md bg-[#1e2535] border border-[#2a3447] px-3 py-2 text-xs text-[#8892a4]">
          Read-only — only the key owner or an admin can modify this monitor.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Endpoint URL"
          placeholder="https://api.example.com/v1/models"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          required
          disabled={!canWrite}
          className="col-span-2"
        />

        <Select label="HTTP Method" value={method} onChange={(e) => setMethod(e.target.value)} disabled={!canWrite}>
          {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>

        <Input
          label="Expected Status"
          type="number"
          min={100}
          max={599}
          value={expectedStatus}
          onChange={(e) => setExpectedStatus(Number(e.target.value))}
          disabled={!canWrite}
        />

        <Select
          label="Key Injection"
          value={injectionType}
          onChange={(e) => setInjectionType(e.target.value)}
          disabled={!canWrite}
        >
          <option value="header">HTTP Header</option>
          <option value="query">Query Parameter</option>
          <option value="body">Request Body</option>
          <option value="custom">Custom (template)</option>
        </Select>

        <Input
          label={injectionType === "header" || injectionType === "custom" ? "Header Name" : "Field Name"}
          placeholder={injectionType === "header" || injectionType === "custom" ? "Authorization" : "api_key"}
          value={injectionKey}
          onChange={(e) => setInjectionKey(e.target.value)}
          required
          disabled={!canWrite}
        />
      </div>

      {(injectionType === "header" || injectionType === "custom") && (
        <Input
          label="Value Format"
          placeholder="Bearer {key}"
          value={injectionFormat}
          onChange={(e) => setInjectionFormat(e.target.value)}
          hint={injectionHints[injectionType]}
          disabled={!canWrite}
        />
      )}

      {injectionType !== "header" && injectionType !== "custom" && (
        <p className="text-xs text-[#8892a4]">{injectionHints[injectionType]}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Check Interval"
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(Number(e.target.value))}
          disabled={!canWrite}
        >
          <option value={1}>Every 1 minute</option>
          <option value={5}>Every 5 minutes</option>
          <option value={15}>Every 15 minutes</option>
          <option value={30}>Every 30 minutes</option>
          <option value={60}>Every hour</option>
          <option value={360}>Every 6 hours</option>
          <option value={720}>Every 12 hours</option>
          <option value={1440}>Daily</option>
        </Select>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#c8cdd6]">Enabled</label>
          <button
            type="button"
            onClick={() => canWrite && setEnabled(!enabled)}
            disabled={!canWrite}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? "bg-blue-600" : "bg-[#2a3447]"
            } ${!canWrite ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {testResult && (
        <div className={`rounded-md px-4 py-3 text-sm border ${
          testResult.ok
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          <div className="flex items-center gap-2">
            <Badge variant={testResult.ok ? "success" : "danger"}>
              {testResult.ok ? "✓ Pass" : "✗ Fail"}
            </Badge>
            {testResult.statusCode && <span>HTTP {testResult.statusCode}</span>}
            {testResult.responseMs != null && <span>{formatMs(testResult.responseMs)}</span>}
            {testResult.errorMessage && <span>{testResult.errorMessage}</span>}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {canWrite && (
          <Button type="submit" loading={saving}>
            <Save className="h-3.5 w-3.5" /> Save Config
          </Button>
        )}
        <Button type="button" variant="secondary" loading={testing} onClick={handleTest}>
          <PlayCircle className="h-3.5 w-3.5" /> Test Now
        </Button>
        {canWrite && config && (
          <Button type="button" variant="danger" onClick={handleDelete} className="ml-auto">
            <Trash2 className="h-3.5 w-3.5" /> Remove Monitor
          </Button>
        )}
      </div>
    </form>
  );
}
