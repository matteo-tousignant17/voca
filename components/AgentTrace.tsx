"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { AgentEvent, ToolResultDetail } from "@/lib/agent";
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

function DetailBlock({ details }: { details: ToolResultDetail }) {
  if (details.kind === "kv") {
    return (
      <div className="space-y-0.5">
        {details.rows.map((row, i) => (
          <div key={i} className="flex justify-between gap-3 text-[11px]">
            <span className="text-gray-600">{row.label}</span>
            <span className="text-gray-400 font-mono">{row.value}</span>
          </div>
        ))}
      </div>
    );
  }
  if (details.kind === "list") {
    return (
      <ul className="space-y-0.5">
        {details.items.map((item, i) => (
          <li key={i} className="text-[11px] text-gray-400 flex gap-1.5">
            <span className="text-gray-700">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (details.kind === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              {details.columns.map((c) => (
                <th
                  key={c}
                  className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider pb-1.5 pr-3"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {details.rows.map((row, i) => (
              <tr key={i} className="border-t border-white/[0.04]">
                {row.map((cell, j) => (
                  <td key={j} className="py-1 pr-3 text-gray-400 align-top">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (details.kind === "quotes") {
    return (
      <div className="space-y-1.5">
        {details.items.map((q, i) => (
          <div key={i} className="border-l-2 border-violet-500/30 pl-2.5">
            <p className="text-[11px] italic text-gray-400 leading-relaxed">&ldquo;{q.quote}&rdquo;</p>
            <p className="text-[10px] text-gray-600 mt-0.5">
              — {q.source}{q.tier ? `, ${q.tier}` : ""}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function AgentTrace({ entries, isRunning, isIdeating }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLive = isRunning || isIdeating;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
            const hasDetails = !!event.details;
            const isOpen = !!expanded[entry.id];
            return (
              <div key={entry.id} className="pl-4">
                <button
                  type="button"
                  disabled={!hasDetails}
                  onClick={() => hasDetails && setExpanded((p) => ({ ...p, [entry.id]: !p[entry.id] }))}
                  className={`flex gap-2 text-emerald-600 text-left w-full ${
                    hasDetails ? "hover:text-emerald-400 cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span className="shrink-0 select-none">✓</span>
                  {hasDetails && (
                    <ChevronRight
                      size={11}
                      className={`shrink-0 mt-0.5 text-gray-700 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                  )}
                  <span className="leading-snug">{event.summary}</span>
                </button>
                {hasDetails && isOpen && event.details && (
                  <div className="mt-1.5 ml-5 px-3 py-2.5 rounded-md border border-white/[0.05] bg-white/[0.02]">
                    <DetailBlock details={event.details} />
                  </div>
                )}
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
    </div>
  );
}
