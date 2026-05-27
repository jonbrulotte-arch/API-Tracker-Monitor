"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, Clock, Wifi } from "lucide-react";
import type { Alert } from "@/app/api/alerts/route";

const POLL_MS = 60_000; // refresh every 60 s

function AlertIcon({ type }: { type: Alert["type"] }) {
  if (type === "expired") return <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />;
  if (type === "expiring") return <Clock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />;
  return <Wifi className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />;
}

function alertLabel(a: Alert): string {
  if (a.type === "expired") return `${a.keyName} has expired`;
  if (a.type === "expiring") {
    return a.daysLeft === 0
      ? `${a.keyName} expires today`
      : `${a.keyName} expires in ${a.daysLeft}d`;
  }
  return `${a.keyName} monitor failing`;
}

function alertSub(a: Alert): string {
  if (a.type === "expired" || a.type === "expiring") return a.provider;
  return a.errorMessage ? `${a.provider} — ${a.errorMessage}` : a.provider;
}

function alertColor(a: Alert): string {
  if (a.type === "expired") return "border-l-red-500";
  if (a.type === "expiring" && (a.daysLeft ?? 99) <= 3) return "border-l-red-500";
  if (a.type === "expiring") return "border-l-amber-500";
  return "border-l-red-500";
}

export function NotificationBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) setAlerts(await res.json());
    } catch {
      // ignore network errors silently
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const t = setInterval(fetchAlerts, POLL_MS);
    return () => clearInterval(t);
  }, [fetchAlerts]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const count = alerts.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-[#8892a4] hover:bg-[#161b27] hover:text-[#e8eaf0] transition-colors"
        aria-label={`Notifications${count > 0 ? ` (${count})` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 rounded-lg border border-[#1e2535] bg-[#0d1018] shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e2535]">
            <span className="text-xs font-semibold text-[#e8eaf0]">Alerts</span>
            {count > 0 && (
              <span className="text-[10px] text-[#4a5568]">{count} active</span>
            )}
          </div>

          {count === 0 ? (
            <div className="px-4 py-6 text-center">
              <Bell className="h-6 w-6 text-[#2a3447] mx-auto mb-2" />
              <p className="text-xs text-[#4a5568]">All clear — no active alerts</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-[#1a2030]">
              {alerts.map((a, i) => (
                <li key={`${a.id}-${i}`}>
                  <Link
                    href={`/keys/${a.id}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-[#0f1117] transition-colors border-l-2 ${alertColor(a)}`}
                  >
                    <AlertIcon type={a.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#e8eaf0] leading-snug truncate">
                        {alertLabel(a)}
                      </p>
                      <p className="text-[10px] text-[#4a5568] truncate mt-0.5">
                        {alertSub(a)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-[#1e2535] px-4 py-2">
            <button
              onClick={() => { fetchAlerts(); }}
              className="text-[10px] text-[#4a5568] hover:text-[#8892a4] transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
