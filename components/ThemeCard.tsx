"use client";

import { Star, Lightbulb } from "lucide-react";
import type { MouseEvent } from "react";
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

function stripSourceTags(source: string): string {
  return source.replace(/\s*\([^)]*\)/g, "").trim();
}

type Props = {
  item: BriefItem;
  animationDelay?: number;
  isSaved?: boolean;
  isHighlighted?: boolean;
  isActiveDetail?: boolean;
  onSave?: (theme: BriefItem) => void;
  onBodyClick?: (theme: BriefItem) => void;
  onIdeate?: (theme: BriefItem) => void;
};

export default function ThemeCard({
  item,
  animationDelay = 0,
  isSaved = false,
  isHighlighted = false,
  isActiveDetail = false,
  onSave,
  onBodyClick,
  onIdeate,
}: Props) {
  const s = SEVERITY[item.severity] ?? SEVERITY.medium;

  const handleStar = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onSave?.(item);
  };

  const handleIdeate = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onIdeate?.(item);
  };

  const handleBody = () => {
    onBodyClick?.(item);
  };

  const clickable = !!onBodyClick;

  const wrapperClasses = [
    "rounded-lg border bg-[#111113] p-4 animate-fade-in transition-colors",
    isActiveDetail
      ? "border-violet-500/50 ring-1 ring-violet-500/40"
      : isHighlighted
      ? "border-violet-500/40 ring-1 ring-violet-500/40"
      : "border-white/[0.07]",
    clickable ? "cursor-pointer hover:border-white/[0.14]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapperClasses}
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={clickable ? handleBody : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleBody();
              }
            }
          : undefined
      }
    >
      {/* Title + severity */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className="text-[11px] text-gray-600 font-mono shrink-0">#{item.rank}</span>
          <h3 className="text-sm font-semibold text-white truncate">{item.theme_name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>
            {item.severity}
          </span>
          {onSave && (
            <button
              type="button"
              onClick={handleStar}
              title={isSaved ? "Unsave theme" : "Save theme"}
              className="p-1 rounded hover:bg-white/[0.06] transition-colors"
            >
              <Star
                size={13}
                className={
                  isSaved
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-700 hover:text-gray-500"
                }
              />
            </button>
          )}
        </div>
      </div>

      {/* Summary sentence */}
      <p className="text-gray-500 text-xs leading-relaxed mb-3">{item.problem_statement}</p>

      {/* Suggested action */}
      <div className="flex items-start gap-2 bg-emerald-500/[0.05] border border-emerald-500/[0.12] rounded-md px-3 py-2 mb-3">
        <span className="text-emerald-500 text-xs shrink-0 mt-0.5">→</span>
        <p className="text-emerald-400 text-[11px] leading-relaxed flex-1">{item.suggested_action}</p>
        {onIdeate && (
          <button
            type="button"
            onClick={handleIdeate}
            title="Ideate on this theme"
            className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300 hover:text-emerald-100 ml-auto shrink-0 px-1.5 py-0.5 rounded hover:bg-emerald-500/[0.08] transition-colors"
          >
            <Lightbulb size={10} />
            Ideate →
          </button>
        )}
      </div>

      {/* Stats — ARR hero + supporting */}
      <div className="flex gap-2 mb-3">
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-md p-3 flex-[2] text-center">
          <div className="text-white font-semibold text-base">{formatARR(item.arr_at_risk)}</div>
          <div className="text-gray-600 text-[10px] mt-0.5">ARR at risk</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-md p-2.5 flex-1 text-center">
          <div className="text-white font-semibold text-sm">{item.customers_affected.toLocaleString()}</div>
          <div className="text-gray-600 text-[10px] mt-0.5">Customers</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-md p-2.5 flex-1 text-center">
          <div className="text-white font-semibold text-sm">{item.arr_at_risk_pct}%</div>
          <div className="text-gray-600 text-[10px] mt-0.5">of total ARR</div>
        </div>
      </div>

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

      {/* Evidence */}
      {item.evidence?.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">What customers said</div>
          <div className="space-y-1.5">
            {item.evidence.slice(0, 2).map((ev, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-md px-3 py-2">
                <p className="text-gray-400 text-[11px] italic leading-relaxed">
                  &ldquo;{ev.quote.slice(0, 160)}{ev.quote.length > 160 ? "…" : ""}&rdquo;
                </p>
                <p className="text-gray-700 text-[10px] mt-1">
                  — {stripSourceTags(ev.source)}{ev.company_size ? `, ${ev.company_size}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tradeoff chips + churn signal */}
      <div className="space-y-1.5">
        <div className="flex gap-1.5 flex-wrap">
          {[item.tradeoffs.effort, item.tradeoffs.impact, item.tradeoffs.segment_skew].map((t) => (
            <span key={t} className="text-[10px] text-gray-600 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-md">
              {t}
            </span>
          ))}
        </div>
        {item.churn_signal && (
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] font-semibold text-amber-500/70 shrink-0 mt-px">Churn signal:</span>
            <span className="text-[10px] text-amber-300/80 leading-relaxed">{item.churn_signal}</span>
          </div>
        )}
      </div>
    </div>
  );
}
