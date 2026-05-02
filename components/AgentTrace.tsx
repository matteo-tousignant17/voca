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

const TOOL_ICONS: Record<string, string> = {
  fetch_feedback_sources: "📥",
  get_crm_segments: "🏢",
  synthesize_themes: "🧠",
  calculate_reach_impact: "💰",
  generate_prioritized_brief: "📋",
};

const TOOL_LABELS: Record<string, string> = {
  fetch_feedback_sources: "fetch_feedback_sources()",
  get_crm_segments: "get_crm_segments()",
  synthesize_themes: "synthesize_themes()",
  calculate_reach_impact: "calculate_reach_impact()",
  generate_prioritized_brief: "generate_prioritized_brief()",
};

export default function AgentTrace({ entries, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900">
        <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-400 animate-pulse" : entries.length > 0 ? "bg-gray-500" : "bg-gray-700"}`} />
        <span className="text-xs font-mono text-gray-400 font-semibold tracking-wider uppercase">
          Agent Trace
        </span>
        {isRunning && (
          <span className="ml-auto text-xs text-green-400 font-mono animate-pulse">● RUNNING</span>
        )}
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 min-h-0">
        {entries.length === 0 && (
          <div className="text-gray-600 italic">
            Waiting to start analysis...
          </div>
        )}

        {entries.map((entry) => {
          const { event } = entry;

          if (event.type === "trace") {
            return (
              <div key={entry.id} className="flex gap-2 text-gray-400">
                <span className="text-gray-600 shrink-0">›</span>
                <span>{event.message}</span>
              </div>
            );
          }

          if (event.type === "tool_call") {
            const icon = TOOL_ICONS[event.tool] || "🔧";
            const label = TOOL_LABELS[event.tool] || event.tool;
            return (
              <div key={entry.id} className="flex gap-2 items-start mt-2">
                <span className="shrink-0">{icon}</span>
                <div>
                  <span className="text-purple-400 font-semibold">{label}</span>
                  {event.tool === "fetch_feedback_sources" && (
                    <span className="text-gray-500 ml-1">
                      sources=[{(event.input.sources as string[])?.join(", ")}]
                    </span>
                  )}
                </div>
              </div>
            );
          }

          if (event.type === "tool_result") {
            return (
              <div key={entry.id} className="flex gap-2 text-green-400 ml-4">
                <span className="text-green-600 shrink-0">✓</span>
                <span>{event.summary}</span>
              </div>
            );
          }

          if (event.type === "theme") {
            return (
              <div key={entry.id} className="flex gap-2 items-start mt-1">
                <span className="shrink-0 text-yellow-400">★</span>
                <div>
                  <span className="text-yellow-300">Theme #{event.data.rank}: </span>
                  <span className="text-white">{event.data.theme_name}</span>
                  <span className="text-gray-500 ml-2">
                    ${(event.data.arr_at_risk / 1000).toFixed(0)}K ARR at risk
                  </span>
                </div>
              </div>
            );
          }

          if (event.type === "complete") {
            return (
              <div key={entry.id} className="mt-3 pt-3 border-t border-gray-800">
                <div className="text-green-400 font-semibold">✓ Analysis complete</div>
                <div className="text-gray-400 mt-1">
                  {event.total_themes} themes · {event.total_customers} customers · ${(event.total_arr_at_risk / 1000000).toFixed(1)}M ARR analyzed
                </div>
              </div>
            );
          }

          if (event.type === "error") {
            return (
              <div key={entry.id} className="text-red-400 mt-2">
                ✗ Error: {event.message}
              </div>
            );
          }

          return null;
        })}

        {isRunning && (
          <div className="flex gap-1 mt-2 text-gray-600">
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
