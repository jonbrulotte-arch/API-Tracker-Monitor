"use client";

import { Shield, Clock, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-[#e8eaf0]">API Monitor</span>
        </div>

        <div className="rounded-lg border border-[#1e2535] bg-[#161b27] p-8 space-y-5">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
              <Clock className="h-7 w-7 text-amber-400" />
            </div>
          </div>

          <div>
            <h1 className="text-lg font-semibold text-[#e8eaf0] mb-2">
              Account Authorization Pending
            </h1>
            <p className="text-sm text-[#8892a4] leading-relaxed">
              Your account has been created and is awaiting approval from an administrator.
              You&apos;ll have full access once your account is enabled.
            </p>
          </div>

          <div className="rounded-md bg-blue-500/5 border border-blue-500/15 px-4 py-3 text-xs text-[#8892a4] text-left">
            <p className="text-blue-300 font-medium mb-1">What happens next?</p>
            <p>An admin will review and approve your registration. This is a manual process — contact your team admin to expedite access.</p>
          </div>

          <button
            onClick={async () => { await signOut({ redirect: false }); window.location.href = "/login"; }}
            className="flex items-center gap-2 mx-auto text-sm text-[#8892a4] hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
