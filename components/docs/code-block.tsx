"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  label?: string;
}

export function CodeBlock({ code, language = "bash", label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const el = document.createElement("textarea");
        el.value = code;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="rounded-md border border-[#1e2535] overflow-hidden my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1018] border-b border-[#1e2535]">
        <span className="text-[10px] font-semibold text-[#4a5568] uppercase tracking-wider">
          {label ?? language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[#8892a4] hover:text-[#e8eaf0] transition-colors text-xs"
        >
          {copied ? (
            <><Check className="h-3 w-3 text-green-400" /><span className="text-green-400">Copied</span></>
          ) : (
            <><Copy className="h-3 w-3" /><span>Copy</span></>
          )}
        </button>
      </div>
      <pre className="px-4 py-4 overflow-x-auto text-[12px] font-mono leading-relaxed bg-[#080b10]">
        <code className={`language-${language} text-[#a8d8b8]`}>{code}</code>
      </pre>
    </div>
  );
}
