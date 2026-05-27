"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Key,
  Activity,
  Settings,
  LogOut,
  Shield,
  BookOpen,
  Code2,
  History,
  ScrollText,
} from "lucide-react";
import { signOut } from "next-auth/react";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/keys", label: "API Keys", icon: Key },
  { href: "/monitors", label: "Monitors", icon: Activity },
  { href: "/audit", label: "Audit Log", icon: History },
  { href: "/apilog", label: "API Log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

const docsNav = [
  { href: "/guide", label: "User Guide", icon: BookOpen },
  { href: "/docs", label: "API Reference", icon: Code2 },
];

export function Sidebar() {
  const pathname = usePathname();

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
          active
            ? "bg-blue-600/10 text-blue-400"
            : "text-[#8892a4] hover:bg-[#161b27] hover:text-[#e8eaf0]"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-56 border-r border-[#1e2535] bg-[#0d1018] flex flex-col z-10">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#1e2535]">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-[#e8eaf0]">API Monitor</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {mainNav.map((item) => <NavLink key={item.href} {...item} />)}
        </div>

        <div className="mt-5 pt-4 border-t border-[#1e2535]">
          <p className="px-2.5 mb-1.5 text-[10px] font-semibold text-[#4a5568] uppercase tracking-wider">
            Docs
          </p>
          <div className="space-y-0.5">
            {docsNav.map((item) => <NavLink key={item.href} {...item} />)}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#1e2535]">
        <button
          onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-[#8892a4] hover:bg-[#161b27] hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
