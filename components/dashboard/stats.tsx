import { Card } from "@/components/ui/card";
import { Key, AlertTriangle, Activity, XCircle, CheckCircle } from "lucide-react";

interface StatsProps {
  total: number;
  expiringSoon: number;
  expired: number;
  monitored: number;
  failing: number;
}

export function DashboardStats({ total, expiringSoon, expired, monitored, failing }: StatsProps) {
  const healthy = monitored - failing;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Total Keys"
        value={total}
        icon={<Key className="h-4 w-4 text-blue-400" />}
        color="blue"
      />
      <StatCard
        label="Expiring Soon"
        value={expiringSoon}
        icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
        color="amber"
        alert={expiringSoon > 0}
      />
      <StatCard
        label="Expired"
        value={expired}
        icon={<XCircle className="h-4 w-4 text-red-400" />}
        color="red"
        alert={expired > 0}
      />
      <StatCard
        label="Monitored"
        value={monitored}
        icon={<Activity className="h-4 w-4 text-violet-400" />}
        color="violet"
      />
      <StatCard
        label="Healthy"
        value={healthy}
        icon={<CheckCircle className="h-4 w-4 text-green-400" />}
        color="green"
        sub={failing > 0 ? `${failing} failing` : undefined}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "amber" | "red" | "violet" | "green";
  alert?: boolean;
  sub?: string;
}

const colorMap = {
  blue: "border-blue-500/20 bg-blue-500/5",
  amber: "border-amber-500/20 bg-amber-500/5",
  red: "border-red-500/20 bg-red-500/5",
  violet: "border-violet-500/20 bg-violet-500/5",
  green: "border-green-500/20 bg-green-500/5",
};

function StatCard({ label, value, icon, color, alert, sub }: StatCardProps) {
  return (
    <Card className={alert && value > 0 ? colorMap[color] : ""}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#8892a4]">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-[#e8eaf0]">{value}</div>
      {sub && <div className="text-xs text-red-400 mt-1">{sub}</div>}
    </Card>
  );
}
