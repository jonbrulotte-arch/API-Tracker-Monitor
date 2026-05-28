import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-lg border border-[#1e2535] bg-[#161b27] p-5", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>{children}</div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn("text-sm font-semibold text-[#e8eaf0]", className)}>{children}</h3>
  );
}
