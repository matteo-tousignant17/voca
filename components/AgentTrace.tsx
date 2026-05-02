"use client";

import { useEffect, useRef } from "react";
import type { AgentEvent } from "@/lib/agent";

type TraceEntry = {
  id: string;
  event: AgentEvent;
  timestamp: number;
};

type Props = {
  entries: TraceEntry[];
  isRunning: boolean;
};

const TOOL_META: Record<string, { label: string; color: string }> = {
  fetch_feedback_sources: { label: "fetch_feedback_sources()", color: "text-sky-400" },
  get_crm_segments:       { label: "get_crm_segments()",       color: "text-emerald-400" },
  synthesize_themes:      { label: "synthesize_themes()",      color: "text-violet-400" },
  calculate_reach_impact: { label: "calculate_reach_impact()", color: "text-amber-400" },
  generate_prioritized_brief: { label: "generate_prioritized_brief()", color: "text-rose-400" },
};

export default function AgentTrace({ entries, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e]">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Agent Trace</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              live
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-700 font-mono">claude-sonnet-4-6</span>
      </div>

      {/* Log */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 font-mono text-[11.5px] leading-relaxed space-y-0.5">
        {entries.length === 0 && (
          <p className="text-gray-700 italic">Waiting for agent...</p>
        )}

        {entries.map((entry) => {
          const { event } = entry;

          if (event.type === "trace") {
            return (
              <div key={entry.id} className="flex gap-2 text-gray-500">
                <span className="text-gray-700 shrink-0 select-none">›</span>
                <span>{event.message}</span>
              </div>
            );
          }

          if (event.type === "tool_call") {
            const meta = TOOL_META[event.tool];
            return (
              <div key={entry.id} className="flex gap-2 items-baseline pt-1.5">
                <span className="text-gray-600 shrink-0 select-none">⎯</span>
                <span className={`font-semibold ${meta?.color ?? "text-gray-300"}`}>
                  {meta?.label ?? event.tool}
                </span>
                {event.tool === "fetch_feedback_sources" && (
                  <span className="text-gray-600">
                    ({(event.input.sources as string[])?.join(", ")})
                  </span>
                )}
              </div>
            );
          }

          if (event.type === "tool_result") {
            return (
              <div key={entry.id} className="flex gap-2 text-emerald-600 pl-4">
                <span className="shrink-0 select-none">✓</span>
                <span>{event.summary}</span>
              </div>
            );
          }

          if (event.type === "theme") {
            return (
              <div key={entry.id} className="flex gap-2 items-baseline pt-1">
                <span className="text-violet-500 shrink-0 select-none">◆</span>
                <span className="text-violet-300 font-medium">#{event.data.rank}</span>
                <span className="text-gray-200">{event.data.theme_name}</span>
                <span className="text-gray-600 ml-1">
                  ${(event.data.arr_at_risk / 1000).toFixed(0)}K at risk
                </span>
              </div>
            );
          }

          if (event.type === "complete") {
            return (
              <div key={entry.id} className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="text-emerald-400 font-semibold">✓ Complete</div>
                <div className="text-gray-500 mt-0.5">
                  {event.total_themes} themes · {event.total_customers} customers · ${(event.total_arr_at_risk / 1_000_000).toFixed(1)}M ARR
                </div>
              </div>
            );
          }

          if (event.type === "error") {
            return (
              <div key={entry.id} className="text-red-400 mt-2">
                ✗ {event.message}
              </div>
            );
          }

          return null;
        })}

        {isRunning && (
          <div className="flex gap-0.5 mt-2 text-gray-700">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
