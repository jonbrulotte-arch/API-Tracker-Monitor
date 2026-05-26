"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface DocNavProps {
  items: NavItem[];
}

export function DocNav({ items }: DocNavProps) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    const all = items.flatMap((i) => [i.id, ...(i.children?.map((c) => c.id) ?? [])]);
    for (const id of all) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="space-y-0.5">
      {items.map((item) => (
        <div key={item.id}>
          <a
            href={`#${item.id}`}
            className={cn(
              "block text-xs py-1.5 px-2 rounded transition-colors",
              active === item.id
                ? "text-blue-400 bg-blue-500/10"
                : "text-[#8892a4] hover:text-[#e8eaf0]"
            )}
          >
            {item.label}
          </a>
          {item.children?.map((child) => (
            <a
              key={child.id}
              href={`#${child.id}`}
              className={cn(
                "block text-xs py-1 pl-5 pr-2 rounded transition-colors",
                active === child.id
                  ? "text-blue-400"
                  : "text-[#4a5568] hover:text-[#8892a4]"
              )}
            >
              {child.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
