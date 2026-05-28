import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
  muted: "bg-[#1e2535] text-[#8892a4] border-[#2a3447]",
  info: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-blue-400",
  success: "bg-green-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  muted: "bg-[#8892a4]",
  info: "bg-violet-400",
};

export function Badge({ variant = "default", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
