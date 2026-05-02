"use client";

import { X } from "lucide-react";
import type { BriefItem } from "@/lib/agent";

type Mode = "trace" | "detail";

type Props = {
  theme: BriefItem;
  allThemes: BriefItem[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onSelectTheme: (theme: BriefItem) => void;
  onClose: () => void;
  hasTrace: boolean;
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
};

function stripSourceTags(source: string): string {
  return source.replace(/\s*\([^)]*\)/g, "").trim();
}

function formatARR(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function ThemeDetailPane({
  theme,
  allThemes,
  mode,
  onModeChange,
  onSelectTheme,
  onClose,
  hasTrace,
}: Props) {
  const otherThemes = allThemes.filter((t) => t.theme_name !== theme.theme_name);

  // Group quotes by source
  const groupedEvidence = theme.evidence.reduce<Record<string, typeof theme.evidence>>((acc, ev) => {
    const key = stripSourceTags(ev.source) || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e]">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[theme.severity] ?? "bg-gray-500"}`} />
          <span className="text-xs font-medium text-white truncate">{theme.theme_name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Tab pill */}
          <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.06] rounded-md p-0.5">
            <button
              type="button"
              disabled={!hasTrace}
              onClick={() => hasTrace && onModeChange("trace")}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded transition-colors ${
                mode === "trace"
                  ? "bg-white/[0.12] text-white"
                  : hasTrace
                  ? "text-gray-500 hover:text-gray-300"
                  : "text-gray-700 cursor-not-allowed"
              }`}
            >
              Trace
            </button>
            <button
              type="button"
              onClick={() => onModeChange("detail")}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded transition-colors ${
                mode === "detail" ? "bg-white/[0.12] text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Detail
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close detail"
            className="p-1 rounded hover:bg-white/[0.06] transition-colors"
          >
            <X size={13} className="text-gray-600 hover:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-5">
        {/* Summary */}
        <section>
          <p className="text-[12px] text-gray-400 leading-relaxed">{theme.problem_statement}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-[10px] text-rose-300 bg-rose-500/[0.08] border border-rose-500/20 px-2 py-0.5 rounded-md">
              {formatARR(theme.arr_at_risk)} ARR · {theme.arr_at_risk_pct}%
            </span>
            <span className="text-[10px] text-gray-400 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-md">
              {theme.customers_affected.toLocaleString()} customers
            </span>
            <span className="text-[10px] text-gray-400 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-md">
              {theme.severity}
            </span>
          </div>
        </section>

        {/* Full quote list */}
        <section>
          <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Full evidence ({theme.evidence?.length ?? 0})
          </h4>
          {theme.evidence?.length > 0 ? (
            <div className="space-y-2">
              {theme.evidence.map((ev, i) => (
                <div key={i} className="border-l-2 border-violet-500/30 pl-3">
                  <p className="text-[11.5px] italic text-gray-400 leading-relaxed">&ldquo;{ev.quote}&rdquo;</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    — {stripSourceTags(ev.source)}
                    {ev.company_size ? `, ${ev.company_size}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-700 italic">No evidence quotes captured.</p>
          )}
        </section>

        {/* Account-level ARR breakdown */}
        <section>
          <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Account-level ARR breakdown
          </h4>
          {theme.named_at_risk_accounts?.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-white/[0.05]">
              <table className="w-full text-[11px]">
                <thead className="bg-white/[0.02]">
                  <tr>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider py-1.5 px-3">
                      Account
                    </th>
                    <th className="text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider py-1.5 px-3">
                      ARR
                    </th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider py-1.5 px-3">
                      Risk reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {theme.named_at_risk_accounts.map((acct) => (
                    <tr key={acct.name} className="border-t border-white/[0.04]">
                      <td className="py-1.5 px-3 text-gray-200 font-medium whitespace-nowrap">{acct.name}</td>
                      <td className="py-1.5 px-3 text-right text-rose-300 font-mono whitespace-nowrap">
                        ${(acct.arr / 1000).toFixed(0)}K
                      </td>
                      <td className="py-1.5 px-3 text-gray-400">{acct.risk_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[11px] text-gray-700 italic">
              No named at-risk accounts mapped. Segment skew: {theme.tradeoffs.segment_skew}.
            </p>
          )}
          {theme.churn_signal && (
            <div className="mt-2 flex items-start gap-1.5">
              <span className="text-[10px] font-semibold text-amber-500/70 shrink-0 mt-px">Churn signal:</span>
              <span className="text-[10px] text-amber-300/80 leading-relaxed">{theme.churn_signal}</span>
            </div>
          )}
        </section>

        {/* Source attribution */}
        <section>
          <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Source attribution
          </h4>
          {Object.keys(groupedEvidence).length > 0 ? (
            <div className="space-y-2.5">
              {Object.entries(groupedEvidence).map(([source, items]) => (
                <div key={source} className="rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-gray-300">{source}</span>
                    <span className="text-[10px] text-gray-600 font-mono">{items.length} quote{items.length === 1 ? "" : "s"}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {items.map((ev, i) => (
                      <li key={i} className="text-[10.5px] text-gray-500 italic truncate">
                        “{ev.quote.slice(0, 110)}{ev.quote.length > 110 ? "…" : ""}”
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-700 italic">No source attribution available.</p>
          )}
        </section>

        {/* Related themes */}
        {otherThemes.length > 0 && (
          <section>
            <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Related themes
            </h4>
            <div className="space-y-1">
              {otherThemes.map((other) => (
                <button
                  key={other.theme_name}
                  type="button"
                  onClick={() => onSelectTheme(other)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors text-left"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[other.severity] ?? "bg-gray-500"}`}
                  />
                  <span className="text-[11px] text-gray-600 font-mono shrink-0">#{other.rank}</span>
                  <span className="flex-1 text-[11.5px] text-gray-300 truncate">{other.theme_name}</span>
                  <span className="text-[10px] text-rose-300/80 font-mono shrink-0">
                    {formatARR(other.arr_at_risk)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
