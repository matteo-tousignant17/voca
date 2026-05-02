"use client";

import { Lightbulb } from "lucide-react";
import type { BriefItem } from "@/lib/agent";
import type { IdeaItem } from "@/lib/ideate";
import ThemeCard from "./ThemeCard";
import IdeaCard from "./IdeaCard";

type Props = {
  themes: BriefItem[];
  isRunning: boolean;
  isComplete: boolean;
  summary: { total_themes: number; total_arr_at_risk: number; total_customers: number } | null;
  ideas: IdeaItem[];
  isIdeating: boolean;
  isIdeateComplete: boolean;
  onIdeate: () => void;
};

function formatARR(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const LENS_ORDER = ["competitor", "workflow", "automation", "agent"] as const;

function groupedByTheme(ideas: IdeaItem[]): [string, IdeaItem[]][] {
  const map = new Map<string, IdeaItem[]>();
  for (const idea of ideas) {
    if (!map.has(idea.theme_name)) map.set(idea.theme_name, []);
    map.get(idea.theme_name)!.push(idea);
  }
  // Sort within each group by lens order
  for (const [, group] of map) {
    group.sort((a, b) => LENS_ORDER.indexOf(a.lens) - LENS_ORDER.indexOf(b.lens));
  }
  return Array.from(map.entries());
}

export default function OutputPanel({
  themes, isRunning, isComplete, summary,
  ideas, isIdeating, isIdeateComplete, onIdeate,
}: Props) {
  return (
    <div className="flex flex-col h-full bg-[#090909]">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Prioritized Brief</span>
          {isIdeating && (
            <span className="text-[10px] text-indigo-400 font-mono animate-pulse">· Ideating…</span>
          )}
        </div>
        {isComplete && summary && (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-gray-600">{summary.total_themes} themes</span>
            <span className="text-rose-400 font-semibold">{formatARR(summary.total_arr_at_risk)} at risk · 12mo exposure</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
        {/* Empty / loading states */}
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

        {/* Theme cards */}
        {themes.map((theme, i) => (
          <ThemeCard key={theme.theme_name} item={theme} animationDelay={i * 80} />
        ))}

        {/* Ideate CTA — shown after analysis completes, before ideation starts */}
        {isComplete && themes.length > 0 && !isIdeating && !isIdeateComplete && (
          <div className="px-4 py-3 rounded-lg border border-white/[0.05] bg-white/[0.02] flex items-center justify-between">
            <p className="text-gray-600 text-xs">
              {themes.length} themes · {ideas.length === 0 ? "Ready to ideate" : ""}
            </p>
            <button
              onClick={onIdeate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Lightbulb size={11} />
              Ideate →
            </button>
          </div>
        )}

        {/* Ideas section */}
        {(isIdeating || ideas.length > 0) && (
          <>
            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Product Ideas
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* Spinner while waiting for first idea */}
            {isIdeating && ideas.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-6">
                <div className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <p className="text-gray-600 text-xs">Generating ideas across 4 lenses...</p>
              </div>
            )}

            {/* Grouped idea cards */}
            {groupedByTheme(ideas).map(([themeName, themeIdeas]) => (
              <div key={themeName} className="space-y-2">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1 pt-1">
                  {themeName}
                </p>
                {themeIdeas.map((idea, i) => (
                  <IdeaCard key={idea.id} idea={idea} animationDelay={i * 60} />
                ))}
              </div>
            ))}

            {/* Completion footer */}
            {isIdeateComplete && (
              <div className="px-4 py-3 rounded-lg border border-white/[0.05] bg-white/[0.02] text-center">
                <p className="text-gray-600 text-xs">
                  {ideas.length} ideas across {new Set(ideas.map((i) => i.lens)).size} lenses
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
