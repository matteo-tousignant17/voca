"use client";

import { useEffect, useRef } from "react";
import { Square } from "lucide-react";
import type { AgentEvent } from "@/lib/agent";
import type { IdeaEvent } from "@/lib/ideate";

type AnyEvent = AgentEvent | IdeaEvent;

type TraceEntry = {
  id: string;
  event: AnyEvent;
  timestamp: number;
};

type Props = {
  entries: TraceEntry[];
  isRunning: boolean;
  isIdeating?: boolean;
  onStop?: () => void;
};

const TOOL_META: Record<string, { label: string; color: string }> = {
  // Analysis tools
  fetch_feedback_sources:      { label: "fetch_feedback_sources()",      color: "text-sky-400" },
  get_crm_segments:            { label: "get_crm_segments()",            color: "text-emerald-400" },
  synthesize_themes:           { label: "synthesize_themes()",           color: "text-violet-400" },
  calculate_reach_impact:      { label: "calculate_reach_impact()",      color: "text-amber-400" },
  generate_prioritized_brief:  { label: "generate_prioritized_brief()",  color: "text-rose-400" },
  // Ideation tools
  analyze_competitor_landscape: { label: "analyze_competitor_landscape()", color: "text-sky-400" },
  map_workflow_opportunities:   { label: "map_workflow_opportunities()",   color: "text-amber-400" },
  design_automation_solutions:  { label: "design_automation_solutions()",  color: "text-emerald-400" },
  design_agent_solutions:       { label: "design_agent_solutions()",       color: "text-violet-400" },
  compile_ideas:                { label: "compile_ideas()",                color: "text-rose-300" },
};

const LENS_COLORS: Record<string, string> = {
  competitor: "text-sky-300",
  workflow:   "text-amber-300",
  automation: "text-emerald-300",
  agent:      "text-violet-300",
};

export default function AgentTrace({ entries, isRunning, isIdeating, onStop }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLive = isRunning || isIdeating;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e]">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">
            {isIdeating ? "Agent Trace — Ideating" : "Agent Trace"}
          </span>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-mono" style={{ color: isIdeating ? "#818cf8" : "#34d399" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: isIdeating ? "#818cf8" : "#34d399" }} />
              {isIdeating ? "ideating" : "live"}
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
            const isSeparator = event.message.startsWith("──");
            return (
              <div key={entry.id} className={`flex gap-2 ${isSeparator ? "text-gray-700 pt-2" : "text-gray-500"}`}>
                {!isSeparator && <span className="text-gray-700 shrink-0 select-none">›</span>}
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

          if (event.type === "idea") {
            const lensColor = LENS_COLORS[event.data.lens] ?? "text-gray-200";
            return (
              <div key={entry.id} className="flex gap-2 items-baseline pt-1">
                <span className="text-indigo-500 shrink-0 select-none">◈</span>
                <span className={`font-medium ${lensColor}`}>[{event.data.lens}]</span>
                <span className="text-gray-200">{event.data.title}</span>
              </div>
            );
          }

          if (event.type === "complete") {
            return (
              <div key={entry.id} className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="text-emerald-400 font-semibold">✓ Analysis complete</div>
                <div className="text-gray-500 mt-0.5">
                  {event.total_themes} themes · {event.total_customers} customers · ${(event.total_arr_at_risk / 1_000_000).toFixed(1)}M ARR
                </div>
              </div>
            );
          }

          if (event.type === "idea_complete") {
            return (
              <div key={entry.id} className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="text-indigo-400 font-semibold">◈ Ideation complete</div>
                <div className="text-gray-500 mt-0.5">{event.total_ideas} ideas generated</div>
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

        {isLive && (
          <div className="flex gap-0.5 mt-2 text-gray-700">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Stop button — only visible while agent is live */}
      {isLive && onStop && (
        <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
          <button
            onClick={onStop}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold text-white bg-red-600/80 hover:bg-red-600 transition-colors"
          >
            <Square size={11} />
            Stop agent
          </button>
        </div>
      )}
    </div>
  );
}
