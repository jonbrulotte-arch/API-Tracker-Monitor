"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Plus } from "lucide-react";

interface KeyFormProps {
  initialData?: {
    id: string;
    name: string;
    provider: string;
    expiresAt: Date | null;
    tags: string;
    notes: string | null;
  };
}

export function KeyForm({ initialData }: KeyFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

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

      const res = await fetch(isEdit ? `/api/keys/${initialData.id}` : "/api/keys", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

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

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Card>
        <h3 className="text-sm font-semibold text-[#e8eaf0] mb-4">Key Details</h3>
        <div className="space-y-4">
          <Input
            label="Key Name"
            placeholder="e.g. OpenAI Production"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Provider / Service"
            placeholder="e.g. OpenAI, Stripe, GitHub"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            required
          />
          <Input
            label={isEdit ? "New Key Value (leave blank to keep current)" : "Key Value"}
            type="password"
            placeholder={isEdit ? "Enter new value to rotate..." : "sk-..."}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required={!isEdit}
            hint="Stored encrypted using AES-256-GCM"
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-[#e8eaf0] mb-4">Expiry</h3>
        <Input
          label="Expiration Date (optional)"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          hint="Leave blank if this key does not expire"
        />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-[#e8eaf0] mb-4">Tags</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a tag..."
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
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-[#1e2535] border border-[#2a3447] px-2.5 py-0.5 text-xs text-[#8892a4]"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-[#e8eaf0] mb-4">Notes</h3>
        <Textarea
          placeholder="Optional notes, rotation schedule, usage context..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
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
