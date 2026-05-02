"use client";

import type { BriefItem, AgentEvent } from "@/lib/agent";
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
    <div className="flex flex-col h-full bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900">
        <div className={`w-2 h-2 rounded-full ${isComplete ? "bg-blue-400" : isRunning ? "bg-yellow-400 animate-pulse" : "bg-gray-700"}`} />
        <span className="text-xs font-mono text-gray-400 font-semibold tracking-wider uppercase">
          Prioritized Brief
        </span>
        {isComplete && summary && (
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="text-gray-500">{summary.total_themes} themes</span>
            <span className="text-red-400 font-semibold">{formatARR(summary.total_arr_at_risk)} at risk</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {themes.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
              Your evidence-backed, ARR-weighted brief will appear here as the agent synthesizes feedback.
            </p>
          </div>
        )}

        {themes.length === 0 && isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="text-4xl mb-4 animate-spin-slow">⚙️</div>
            <p className="text-gray-500 text-sm">Agent is synthesizing feedback...</p>
          </div>
        )}

        {themes.map((theme, i) => (
          <ThemeCard key={theme.theme_name} item={theme} animationDelay={i * 100} />
        ))}

        {isComplete && themes.length > 0 && (
          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4 text-center">
            <p className="text-gray-400 text-sm">
              Analysis complete · {themes.length} themes synthesized from{" "}
              <span className="text-white font-medium">Reddit, G2, Gong calls, and support tickets</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
