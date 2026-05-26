"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { X, Plus, ChevronDown, ChevronUp, Activity, Info } from "lucide-react";

// ─── Provider presets ────────────────────────────────────────────────────────

interface Preset {
  name: string;
  keyPlaceholder: string;
  monitor: {
    endpoint: string;
    method: string;
    injectionType: string;
    injectionKey: string;
    injectionFormat: string;
    expectedStatus: number;
  } | null;
  note?: string;
}

const PRESETS: Preset[] = [
  {
    name: "OpenAI",
    keyPlaceholder: "sk-proj-...",
    monitor: {
      endpoint: "https://api.openai.com/v1/models",
      method: "GET",
      injectionType: "header",
      injectionKey: "Authorization",
      injectionFormat: "Bearer {key}",
      expectedStatus: 200,
    },
  },
  {
    name: "Anthropic",
    keyPlaceholder: "sk-ant-...",
    monitor: {
      endpoint: "https://api.anthropic.com/v1/models",
      method: "GET",
      injectionType: "header",
      injectionKey: "x-api-key",
      injectionFormat: "{key}",
      expectedStatus: 200,
    },
  },
  {
    name: "GitHub",
    keyPlaceholder: "ghp_...",
    monitor: {
      endpoint: "https://api.github.com/user",
      method: "GET",
      injectionType: "header",
      injectionKey: "Authorization",
      injectionFormat: "Bearer {key}",
      expectedStatus: 200,
    },
  },
  {
    name: "Stripe",
    keyPlaceholder: "sk_live_... or sk_test_...",
    monitor: {
      endpoint: "https://api.stripe.com/v1/balance",
      method: "GET",
      injectionType: "header",
      injectionKey: "Authorization",
      injectionFormat: "Bearer {key}",
      expectedStatus: 200,
    },
  },
  {
    name: "HuggingFace",
    keyPlaceholder: "hf_...",
    monitor: {
      endpoint: "https://huggingface.co/api/whoami",
      method: "GET",
      injectionType: "header",
      injectionKey: "Authorization",
      injectionFormat: "Bearer {key}",
      expectedStatus: 200,
    },
  },
  {
    name: "Slack",
    keyPlaceholder: "xoxb-...",
    monitor: {
      endpoint: "https://slack.com/api/auth.test",
      method: "POST",
      injectionType: "header",
      injectionKey: "Authorization",
      injectionFormat: "Bearer {key}",
      expectedStatus: 200,
    },
  },
  {
    name: "SendGrid",
    keyPlaceholder: "SG...",
    monitor: {
      endpoint: "https://api.sendgrid.com/v3/scopes",
      method: "GET",
      injectionType: "header",
      injectionKey: "Authorization",
      injectionFormat: "Bearer {key}",
      expectedStatus: 200,
    },
  },
  {
    name: "Cloudflare",
    keyPlaceholder: "...",
    monitor: {
      endpoint: "https://api.cloudflare.com/client/v4/user/tokens/verify",
      method: "GET",
      injectionType: "header",
      injectionKey: "Authorization",
      injectionFormat: "Bearer {key}",
      expectedStatus: 200,
    },
  },
  {
    name: "Custom",
    keyPlaceholder: "",
    monitor: null,
    note: "Any service — configure the health check endpoint below",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildRequestPreview(
  endpoint: string,
  method: string,
  injectionType: string,
  injectionKey: string,
  injectionFormat: string,
  expectedStatus: number
): string {
  if (!endpoint) return "";
  const keyToken = "<YOUR_KEY>";
  const valueStr = injectionFormat ? injectionFormat.replace("{key}", keyToken) : keyToken;
  const lines: string[] = [`${method} ${endpoint}`];

  if (injectionType === "header" || injectionType === "custom") {
    lines.push(`${injectionKey}: ${valueStr}`);
  } else if (injectionType === "query") {
    const sep = endpoint.includes("?") ? "&" : "?";
    lines[0] = `${method} ${endpoint}${sep}${injectionKey}=${keyToken}`;
  } else if (injectionType === "body") {
    lines.push(`Content-Type: application/json`);
    lines.push(``);
    lines.push(`{ "${injectionKey}": "${keyToken}" }`);
  }
  lines.push(``);
  lines.push(`→ expect HTTP ${expectedStatus}`);
  return lines.join("\n");
}

// ─── Component ───────────────────────────────────────────────────────────────

interface KeyFormProps {
  initialData?: {
    id: string;
    name: string;
    provider: string;
    expiresAt: Date | null;
    tags: string;
    notes: string | null;
    monitorConfig?: {
      endpoint: string;
      method: string;
      injectionType: string;
      injectionKey: string;
      injectionFormat: string | null;
      expectedStatus: number;
      intervalMinutes: number;
      enabled: boolean;
    } | null;
  };
}

export function KeyForm({ initialData }: KeyFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  // Key fields
  const [name, setName] = useState(initialData?.name ?? "");
  const [provider, setProvider] = useState(initialData?.provider ?? "");
  const [value, setValue] = useState("");
  const [expiresAt, setExpiresAt] = useState(
    initialData?.expiresAt
      ? new Date(initialData.expiresAt).toISOString().split("T")[0]
      : ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [tags, setTags] = useState<string[]>(
    initialData ? JSON.parse(initialData.tags) : []
  );
  const [tagInput, setTagInput] = useState("");

  // Monitor fields
  const existing = initialData?.monitorConfig;
  const [monitorEnabled, setMonitorEnabled] = useState(!!existing);
  const [monitorOpen, setMonitorOpen] = useState(!!existing);
  const [endpoint, setEndpoint] = useState(existing?.endpoint ?? "");
  const [method, setMethod] = useState(existing?.method ?? "GET");
  const [injectionType, setInjectionType] = useState(existing?.injectionType ?? "header");
  const [injectionKey, setInjectionKey] = useState(existing?.injectionKey ?? "Authorization");
  const [injectionFormat, setInjectionFormat] = useState(existing?.injectionFormat ?? "Bearer {key}");
  const [expectedStatus, setExpectedStatus] = useState(existing?.expectedStatus ?? 200);
  const [intervalMinutes, setIntervalMinutes] = useState(existing?.intervalMinutes ?? 15);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Preset selection ──────────────────────────────────────────────────────

  const applyPreset = (preset: Preset) => {
    setProvider(preset.name === "Custom" ? "" : preset.name);
    if (!name) setName(preset.name === "Custom" ? "" : `${preset.name} `);
    if (preset.monitor) {
      setEndpoint(preset.monitor.endpoint);
      setMethod(preset.monitor.method);
      setInjectionType(preset.monitor.injectionType);
      setInjectionKey(preset.monitor.injectionKey);
      setInjectionFormat(preset.monitor.injectionFormat);
      setExpectedStatus(preset.monitor.expectedStatus);
      setMonitorEnabled(true);
      setMonitorOpen(true);
    } else {
      setMonitorOpen(true);
    }
  };

  // ── Tags ─────────────────────────────────────────────────────────────────

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name,
        provider,
        tags,
        notes: notes || null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      if (!isEdit || value) body.value = value;

      if (monitorEnabled && endpoint) {
        body.monitor = {
          endpoint,
          method,
          injectionType,
          injectionKey,
          injectionFormat:
            injectionType === "header" || injectionType === "custom" ? injectionFormat : null,
          expectedStatus,
          intervalMinutes,
          enabled: true,
        };
      }

      const res = await fetch(isEdit ? `/api/keys/${initialData.id}` : "/api/keys", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (isEdit && monitorEnabled && endpoint) {
        await fetch(`/api/keys/${initialData!.id}/monitor`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint, method, injectionType,
            injectionKey,
            injectionFormat: injectionType === "header" || injectionType === "custom" ? injectionFormat : null,
            expectedStatus, intervalMinutes, enabled: true,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Validation failed");
        return;
      }

      router.push("/keys");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const requestPreview = monitorEnabled && endpoint
    ? buildRequestPreview(endpoint, method, injectionType, injectionKey, injectionFormat, expectedStatus)
    : null;

  const injectionTypeLabel: Record<string, string> = {
    header: "HTTP Header",
    query: "URL Query Parameter",
    body: "JSON Request Body",
    custom: "Custom Header Template",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Quick-start presets ─────────────────────────────────────────── */}
      {!isEdit && (
        <Card>
          <h3 className="text-sm font-semibold text-[#e8eaf0] mb-1">Quick Start</h3>
          <p className="text-xs text-[#8892a4] mb-3">
            Pick your service to pre-fill the monitor config, or choose Custom for anything else.
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  provider === p.name || (p.name === "Custom" && !PRESETS.slice(0, -1).map(x => x.name).includes(provider))
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                    : "bg-[#1e2535] border-[#2a3447] text-[#8892a4] hover:text-[#e8eaf0] hover:border-[#3a4558]"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          {PRESETS.find(p => p.name === provider)?.note && (
            <p className="text-xs text-amber-400/80 mt-2 flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              {PRESETS.find(p => p.name === provider)?.note}
            </p>
          )}
        </Card>
      )}

      {/* ── Key details ─────────────────────────────────────────────────── */}
      <Card>
        <h3 className="text-sm font-semibold text-[#e8eaf0] mb-4">Key Details</h3>
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. OpenAI Production, Stripe Live"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hint="A friendly label to identify this key in your dashboard"
            required
          />
          <Input
            label="Service / Provider"
            placeholder="e.g. OpenAI, Stripe, My Internal API"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            hint="Any service — this is just for labelling, not a restricted list"
            required
          />
          <Input
            label={isEdit ? "New Key Value (leave blank to keep current)" : "Key Value"}
            type="password"
            placeholder={
              PRESETS.find(p => p.name === provider)?.keyPlaceholder ||
              (isEdit ? "Enter new value to rotate..." : "Paste your API key here")
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required={!isEdit}
            hint="Encrypted with AES-256-GCM before storage — never saved in plain text"
          />
        </div>
      </Card>

      {/* ── Health check monitor ─────────────────────────────────────────── */}
      <Card>
        <button
          type="button"
          className="flex items-center justify-between w-full"
          onClick={() => setMonitorOpen(!monitorOpen)}
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#8892a4]" />
            <h3 className="text-sm font-semibold text-[#e8eaf0]">Health Check Monitor</h3>
            {monitorEnabled && endpoint && (
              <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 rounded-full px-2 py-0.5">
                configured
              </span>
            )}
          </div>
          {monitorOpen ? <ChevronUp className="h-4 w-4 text-[#8892a4]" /> : <ChevronDown className="h-4 w-4 text-[#8892a4]" />}
        </button>

        {!monitorOpen && (
          <p className="text-xs text-[#8892a4] mt-2">
            Optionally configure a test endpoint — we'll call it on a schedule to verify the key still works.
          </p>
        )}

        {monitorOpen && (
          <div className="mt-4 space-y-4">
            {/* Explainer */}
            <div className="rounded-md bg-blue-500/5 border border-blue-500/15 px-4 py-3 text-xs text-[#8892a4] space-y-1">
              <p className="text-blue-300 font-medium">How health checks work</p>
              <p>
                On a schedule you choose, this app makes an HTTP request to the endpoint below —
                with your key injected into the request. If the response status matches what you
                expect, the key is marked <span className="text-green-400">healthy</span>. Otherwise
                it's <span className="text-red-400">failing</span> and you'll get a Slack alert.
              </p>
              <p>Your key value is never sent to any third party — only to the endpoint you configure.</p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setMonitorEnabled(!monitorEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  monitorEnabled ? "bg-blue-600" : "bg-[#2a3447]"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  monitorEnabled ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
              <span className="text-sm text-[#e8eaf0]">Enable health check monitoring</span>
            </label>

            {monitorEnabled && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Test Endpoint URL"
                    placeholder="https://api.example.com/v1/ping"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    hint="A lightweight endpoint that returns success when the key is valid"
                    className="col-span-2"
                  />
                  <Select
                    label="Method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="How to send the key"
                    value={injectionType}
                    onChange={(e) => {
                      setInjectionType(e.target.value);
                      if (e.target.value === "query") setInjectionKey("api_key");
                      if (e.target.value === "body") setInjectionKey("api_key");
                      if (e.target.value === "header" || e.target.value === "custom") setInjectionKey("Authorization");
                    }}
                  >
                    <option value="header">HTTP Header — e.g. Authorization: Bearer …</option>
                    <option value="query">URL Query Param — e.g. ?api_key=…</option>
                    <option value="body">JSON Body — e.g. {`{"api_key": "…"}`}</option>
                    <option value="custom">Custom Header Template</option>
                  </Select>

                  <Input
                    label={injectionType === "query" || injectionType === "body" ? "Parameter / Field Name" : "Header Name"}
                    placeholder={injectionType === "query" || injectionType === "body" ? "api_key" : "Authorization"}
                    value={injectionKey}
                    onChange={(e) => setInjectionKey(e.target.value)}
                    required={monitorEnabled}
                  />
                </div>

                {(injectionType === "header" || injectionType === "custom") && (
                  <Input
                    label="Header value format"
                    placeholder="Bearer {key}"
                    value={injectionFormat}
                    onChange={(e) => setInjectionFormat(e.target.value)}
                    hint='Use {key} as the placeholder for your key value. e.g. "Bearer {key}" or just "{key}"'
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Expected HTTP status"
                    type="number"
                    min={100}
                    max={599}
                    value={expectedStatus}
                    onChange={(e) => setExpectedStatus(Number(e.target.value))}
                    hint="The status code that means the key is valid (usually 200)"
                  />
                  <Select
                    label="Check every"
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={360}>6 hours</option>
                    <option value={720}>12 hours</option>
                    <option value={1440}>Daily</option>
                  </Select>
                </div>

                {/* Live request preview */}
                {requestPreview && (
                  <div className="rounded-md border border-[#2a3447] bg-[#0a0d14] overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a3447] bg-[#0f1117]">
                      <span className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider">
                        Request Preview
                      </span>
                      <span className="text-[10px] text-[#4a5568]">
                        (key value shown as placeholder)
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-[#6ee7b7] px-4 py-3 whitespace-pre overflow-x-auto leading-relaxed">
                      {requestPreview}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Expiry ──────────────────────────────────────────────────────── */}
      <Card>
        <h3 className="text-sm font-semibold text-[#e8eaf0] mb-4">Expiry</h3>
        <Input
          label="Expiration Date (optional)"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          hint="You'll get a Slack warning before this date if notifications are configured"
        />
      </Card>

      {/* ── Tags ────────────────────────────────────────────────────────── */}
      <Card>
        <h3 className="text-sm font-semibold text-[#e8eaf0] mb-1">Tags</h3>
        <p className="text-xs text-[#8892a4] mb-3">
          Use tags to filter keys in the dashboard, e.g. <code className="text-blue-400">production</code>, <code className="text-blue-400">internal</code>, <code className="text-blue-400">ci</code>
        </p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addTag(); }
              }}
              className="flex-1 h-9 rounded-md border border-[#2a3447] bg-[#0f1117] px-3 text-sm text-[#e8eaf0] placeholder:text-[#4a5568] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addTag}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#1e2535] border border-[#2a3447] px-2.5 py-0.5 text-xs text-[#8892a4]">
                  {t}
                  <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-red-400 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      <Card>
        <h3 className="text-sm font-semibold text-[#e8eaf0] mb-1">Notes</h3>
        <p className="text-xs text-[#8892a4] mb-3">Rotation schedule, usage context, team owner, linked docs — anything useful</p>
        <Textarea
          placeholder="e.g. Rotates every 90 days. Owned by platform team. See runbook at..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={loading}>
          {isEdit ? "Save Changes" : "Add Key"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
