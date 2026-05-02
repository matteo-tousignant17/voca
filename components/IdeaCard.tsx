"use client";

import type { IdeaItem, IdeaLens } from "@/lib/ideate";

const LENS_META: Record<IdeaLens, { label: string; badge: string; border: string; accentBorder: string; accentText: string }> = {
  competitor: {
    label: "Competitor",
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    border: "border-sky-500/15",
    accentBorder: "border-l-sky-500/40",
    accentText: "text-sky-400/70",
  },
  workflow: {
    label: "Workflow",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    border: "border-amber-500/15",
    accentBorder: "border-l-amber-500/40",
    accentText: "text-amber-400/70",
  },
  automation: {
    label: "Automation",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    border: "border-emerald-500/15",
    accentBorder: "border-l-emerald-500/40",
    accentText: "text-emerald-400/70",
  },
  agent: {
    label: "Agent / AI",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    border: "border-violet-500/15",
    accentBorder: "border-l-violet-500/40",
    accentText: "text-violet-400/70",
  },
};

const EFFORT_LABEL: Record<string, string> = { low: "Low effort", medium: "Med effort", high: "High effort" };
const IMPACT_COLOR: Record<string, string> = {
  high: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-gray-400 bg-white/[0.04] border-white/[0.08]",
};

export default function IdeaCard({ idea, animationDelay = 0 }: { idea: IdeaItem; animationDelay?: number }) {
  const meta = LENS_META[idea.lens];

  return (
    <div
      className={`rounded-lg border ${meta.border} bg-[#111113] p-4 animate-fade-in`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>
          {meta.label}
        </span>
        <span className="text-[10px] text-gray-600 truncate flex-1 min-w-0">{idea.theme_name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-gray-600 bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md">
            {EFFORT_LABEL[idea.effort]}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${IMPACT_COLOR[idea.impact]}`}>
            {idea.impact} impact
          </span>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-white leading-snug mb-1">{idea.title}</h4>

      {/* Summary */}
      <p className="text-xs text-gray-500 leading-relaxed mb-3">{idea.summary}</p>

      {/* Key insight */}
      <div className={`border-l-2 ${meta.accentBorder} pl-3 mb-3`}>
        <p className={`text-[11px] italic leading-relaxed ${meta.accentText}`}>{idea.key_insight}</p>
      </div>

      {/* Tactics */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Tactics</div>
        <ul className="space-y-1">
          {idea.tactics.map((tactic, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
              <span className="text-gray-700 shrink-0 mt-0.5">•</span>
              <span>{tactic}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Timeframe */}
      <div className="flex justify-end">
        <span className="text-[10px] text-gray-600 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-md">
          {idea.timeframe}
        </span>
      </div>
    </div>
  );
}
