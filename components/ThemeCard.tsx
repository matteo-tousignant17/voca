"use client";

import type { BriefItem } from "@/lib/agent";

const SEVERITY_STYLES: Record<string, { badge: string; border: string; glow: string }> = {
  critical: {
    badge: "bg-red-500/20 text-red-300 border border-red-500/40",
    border: "border-red-500/30",
    glow: "shadow-red-500/10",
  },
  high: {
    badge: "bg-orange-500/20 text-orange-300 border border-orange-500/40",
    border: "border-orange-500/30",
    glow: "shadow-orange-500/10",
  },
  medium: {
    badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
    border: "border-yellow-500/30",
    glow: "shadow-yellow-500/10",
  },
  low: {
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/10",
  },
};

function formatARR(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

type Props = {
  item: BriefItem;
  animationDelay?: number;
};

export default function ThemeCard({ item, animationDelay = 0 }: Props) {
  const styles = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.medium;

  return (
    <div
      className={`rounded-xl border ${styles.border} bg-gray-900/80 shadow-lg ${styles.glow} p-5 animate-fade-in`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-500 font-mono text-sm shrink-0">#{item.rank}</span>
          <h3 className="text-white font-semibold text-base leading-tight truncate">{item.theme_name}</h3>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${styles.badge}`}>
          {item.severity.toUpperCase()}
        </span>
      </div>

      {/* Problem statement */}
      <p className="text-gray-400 text-sm mb-4 leading-relaxed">{item.problem_statement}</p>

      {/* Impact metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-800/60 rounded-lg p-3 text-center">
          <div className="text-white font-bold text-lg">{formatARR(item.arr_at_risk)}</div>
          <div className="text-gray-500 text-xs mt-0.5">ARR at risk</div>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-3 text-center">
          <div className="text-white font-bold text-lg">{item.customers_affected.toLocaleString()}</div>
          <div className="text-gray-500 text-xs mt-0.5">Customers</div>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-3 text-center">
          <div className="text-white font-bold text-lg">{item.arr_at_risk_pct}%</div>
          <div className="text-gray-500 text-xs mt-0.5">of total ARR</div>
        </div>
      </div>

      {/* Evidence quotes */}
      {item.evidence && item.evidence.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Evidence</div>
          {item.evidence.slice(0, 2).map((ev, i) => (
            <div key={i} className="bg-gray-800/40 rounded-lg px-3 py-2">
              <p className="text-gray-300 text-xs italic leading-relaxed">
                &ldquo;{ev.quote.slice(0, 160)}{ev.quote.length > 160 ? "..." : ""}&rdquo;
              </p>
              <p className="text-gray-600 text-xs mt-1">
                — {ev.source}{ev.company_size ? `, ${ev.company_size}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tradeoffs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-md">
          Effort: {item.tradeoffs.effort}
        </span>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-md">
          {item.tradeoffs.impact}
        </span>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-md">
          {item.tradeoffs.segment_skew}
        </span>
      </div>

      {/* Suggested action */}
      <div className="flex items-start gap-2 bg-gray-800/40 border border-gray-700/50 rounded-lg px-3 py-2">
        <span className="text-green-400 text-sm shrink-0 mt-0.5">→</span>
        <p className="text-green-300 text-xs leading-relaxed">{item.suggested_action}</p>
      </div>
    </div>
  );
}
