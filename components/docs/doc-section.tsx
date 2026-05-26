interface DocSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export function DocSection({ id, title, children }: DocSectionProps) {
  return (
    <section id={id} className="scroll-mt-20 pb-10 border-b border-[#1e2535] last:border-0">
      <h2 className="text-base font-semibold text-[#e8eaf0] mb-4">{title}</h2>
      <div className="text-sm text-[#8892a4] space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

interface DocSubSectionProps {
  id?: string;
  title: string;
  children: React.ReactNode;
}

export function DocSubSection({ id, title, children }: DocSubSectionProps) {
  return (
    <div id={id} className="scroll-mt-20 pt-4">
      <h3 className="text-sm font-semibold text-[#c8cdd6] mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#8892a4] leading-relaxed">{children}</p>;
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[11px] bg-[#1e2535] border border-[#2a3447] text-blue-300 rounded px-1.5 py-0.5">
      {children}
    </code>
  );
}

export function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-[#1e2535]">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#1e2535] bg-[#0d1018]">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-[#8892a4] font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#1a2030] last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-[#8892a4] align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "warning" | "tip" | "security";
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-500/5 border-blue-500/20 text-blue-200",
    warning: "bg-amber-500/5 border-amber-500/20 text-amber-200",
    tip: "bg-green-500/5 border-green-500/20 text-green-200",
    security: "bg-violet-500/5 border-violet-500/20 text-violet-200",
  };
  const icons = { info: "ℹ", warning: "⚠", tip: "💡", security: "🔒" };

  return (
    <div className={`rounded-md border px-4 py-3 text-xs leading-relaxed ${styles[type]}`}>
      {title && (
        <p className="font-semibold mb-1">
          {icons[type]} {title}
        </p>
      )}
      <div className="opacity-90">{children}</div>
    </div>
  );
}

export function EndpointBadge({ method, path }: { method: string; path: string }) {
  const colors: Record<string, string> = {
    GET: "bg-green-500/10 text-green-400 border-green-500/20",
    POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    PUT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
    PATCH: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };

  return (
    <div className="flex items-center gap-2 font-mono text-xs my-2">
      <span className={`px-2 py-0.5 rounded border font-bold text-[11px] ${colors[method] ?? colors.GET}`}>
        {method}
      </span>
      <span className="text-[#e8eaf0]">{path}</span>
    </div>
  );
}
