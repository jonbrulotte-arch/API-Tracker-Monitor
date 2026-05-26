"use client";

import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";

interface TopbarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, description, actions }: TopbarProps) {
  const { data: session } = useSession();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2535] bg-[#0d1018]/60 backdrop-blur-sm sticky top-0 z-[5]">
      <div>
        <h1 className="text-base font-semibold text-[#e8eaf0]">{title}</h1>
        {description && <p className="text-xs text-[#8892a4] mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-[#8892a4] hover:bg-[#161b27] hover:text-[#e8eaf0] transition-colors">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">
          {session?.user?.name?.charAt(0).toUpperCase() ?? session?.user?.email?.charAt(0).toUpperCase() ?? "?"}
        </div>
      </div>
    </div>
  );
}
