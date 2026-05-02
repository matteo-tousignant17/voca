"use client";

import type { BriefItem } from "@/lib/agent";
import ThemeCard from "./ThemeCard";

type Props = {
  themes: BriefItem[];
  isRunning: boolean;
  isComplete: boolean;
  summary: { total_themes: number; total_arr_at_risk: number; total_customers: number } | null;
};

function formatARR(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function OutputPanel({ themes, isRunning, isComplete, summary }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#090909]">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
        <span className="text-xs font-medium text-gray-400">Prioritized Brief</span>
        {isComplete && summary && (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-gray-600">{summary.total_themes} themes</span>
            <span className="text-rose-400 font-semibold">{formatARR(summary.total_arr_at_risk)} at risk</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
        {themes.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-12">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <p className="text-gray-600 text-xs max-w-[220px] leading-relaxed">
              Run the agent to get an evidence-backed, ARR-weighted brief.
            </p>
          </div>
        )}

        {themes.length === 0 && isRunning && (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-12">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            <p className="text-gray-600 text-xs">Synthesizing themes...</p>
          </div>
        )}

        {themes.map((theme, i) => (
          <ThemeCard key={theme.theme_name} item={theme} animationDelay={i * 80} />
        ))}

        {isComplete && themes.length > 0 && (
          <div className="px-4 py-3 rounded-lg border border-white/[0.05] bg-white/[0.02] text-center">
            <p className="text-gray-600 text-xs">
              {themes.length} themes from Reddit, G2, Gong & support tickets
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
