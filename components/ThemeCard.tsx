"use client";

import type { BriefItem } from "@/lib/agent";

const SEVERITY: Record<string, { badge: string; bar: string; dot: string }> = {
  critical: { badge: "bg-red-500/10 text-red-400 border-red-500/20",   bar: "bg-red-500",    dot: "bg-red-500" },
  high:     { badge: "bg-orange-500/10 text-orange-400 border-orange-500/20", bar: "bg-orange-500", dot: "bg-orange-500" },
  medium:   { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",  bar: "bg-amber-500",  dot: "bg-amber-500" },
  low:      { badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",   bar: "bg-blue-500",   dot: "bg-blue-500" },
};

function formatARR(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function ThemeCard({ item, animationDelay = 0 }: { item: BriefItem; animationDelay?: number }) {
  const s = SEVERITY[item.severity] ?? SEVERITY.medium;

  return (
    <div
      className="rounded-lg border border-white/[0.07] bg-[#111113] p-4 animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className="text-[11px] text-gray-600 font-mono shrink-0">#{item.rank}</span>
          <h3 className="text-sm font-semibold text-white truncate">{item.theme_name}</h3>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${s.badge}`}>
          {item.severity}
        </span>
      </div>

      {/* Problem statement */}
      <p className="text-gray-500 text-xs leading-relaxed mb-3">{item.problem_statement}</p>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { value: formatARR(item.arr_at_risk), label: "ARR at risk" },
          { value: item.customers_affected.toLocaleString(), label: "Customers" },
          { value: `${item.arr_at_risk_pct}%`, label: "of total ARR" },
        ].map((m) => (
          <div key={m.label} className="bg-white/[0.03] border border-white/[0.05] rounded-md p-2.5 text-center">
            <div className="text-white font-semibold text-sm">{m.value}</div>
            <div className="text-gray-600 text-[10px] mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Evidence */}
      {item.evidence?.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Evidence</div>
          <div className="space-y-1.5">
            {item.evidence.slice(0, 2).map((ev, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-md px-3 py-2">
                <p className="text-gray-400 text-[11px] italic leading-relaxed">
                  &ldquo;{ev.quote.slice(0, 160)}{ev.quote.length > 160 ? "…" : ""}&rdquo;
                </p>
                <p className="text-gray-700 text-[10px] mt-1">
                  — {ev.source}{ev.company_size ? `, ${ev.company_size}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Named at-risk accounts */}
      {item.named_at_risk_accounts?.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Named at-risk accounts
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.named_at_risk_accounts.map((acct) => (
              <span
                key={acct.name}
                title={acct.risk_reason}
                className="text-[10px] text-rose-300 bg-rose-500/[0.08] border border-rose-500/20 px-2 py-0.5 rounded-md"
              >
                {acct.name} · ${(acct.arr / 1000).toFixed(0)}K
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tradeoff chips */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {[item.tradeoffs.effort, item.tradeoffs.impact, item.tradeoffs.segment_skew].map((t) => (
          <span key={t} className="text-[10px] text-gray-600 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-md">
            {t}
          </span>
        ))}
        {item.churn_signal && (
          <span
            className="text-[10px] text-amber-300 bg-amber-500/[0.07] border border-amber-500/20 px-2 py-0.5 rounded-md"
            title="Churn signal from CRM"
          >
            {item.churn_signal}
          </span>
        )}
      </div>

      {/* Suggested action */}
      <div className="flex items-start gap-2 bg-emerald-500/[0.05] border border-emerald-500/[0.12] rounded-md px-3 py-2">
        <span className="text-emerald-500 text-xs shrink-0 mt-0.5">→</span>
        <p className="text-emerald-400 text-[11px] leading-relaxed">{item.suggested_action}</p>
      </div>
    </div>
  );
}
