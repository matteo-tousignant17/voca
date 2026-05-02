"use client";

import { useEffect, useMemo, useRef, useState, useCallback, KeyboardEvent } from "react";
import { Brain, ChevronRight, Cpu } from "lucide-react";
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
  onFollowUp?: (text: string) => void;
  showDetailToggle?: boolean;
  onSwitchToDetail?: () => void;
  /** Hide live-engine chrome (orchestrator · tools) during deterministic demo playback */
  isDemo?: boolean;
};

const TOOL_META: Record<string, { label: string; color: string; dot: string }> = {
  // Analysis tools
  fetch_feedback_sources:      { label: "fetch_feedback_sources",      color: "text-sky-400",     dot: "bg-sky-400" },
  get_crm_segments:            { label: "get_crm_segments",            color: "text-emerald-400", dot: "bg-emerald-400" },
  synthesize_themes:           { label: "synthesize_themes",           color: "text-violet-400",  dot: "bg-violet-400" },
  calculate_reach_impact:      { label: "calculate_reach_impact",      color: "text-amber-400",   dot: "bg-amber-400" },
  generate_prioritized_brief:  { label: "generate_prioritized_brief",  color: "text-rose-400",    dot: "bg-rose-400" },
  // Per-source fetch tools (demo mode)
  fetch_salesforce_notes:      { label: "fetch_salesforce_notes",      color: "text-sky-300",     dot: "bg-sky-300" },
  fetch_zendesk_tickets:       { label: "fetch_zendesk_tickets",       color: "text-emerald-300", dot: "bg-emerald-300" },
  fetch_gong_transcripts:      { label: "fetch_gong_transcripts",      color: "text-violet-300",  dot: "bg-violet-300" },
  fetch_g2_reviews:            { label: "fetch_g2_reviews",            color: "text-rose-300",    dot: "bg-rose-300" },
  fetch_reddit_posts:          { label: "fetch_reddit_posts",          color: "text-orange-300",  dot: "bg-orange-300" },
  fetch_amplitude_signals:     { label: "fetch_amplitude_signals",     color: "text-indigo-300",  dot: "bg-indigo-300" },
  fetch_pendo_signals:         { label: "fetch_pendo_signals",         color: "text-amber-300",   dot: "bg-amber-300" },
  // Ideation tools
  analyze_competitor_landscape: { label: "analyze_competitor_landscape", color: "text-sky-400",     dot: "bg-sky-400" },
  map_workflow_opportunities:   { label: "map_workflow_opportunities",   color: "text-amber-400",   dot: "bg-amber-400" },
  design_automation_solutions:  { label: "design_automation_solutions",  color: "text-emerald-400", dot: "bg-emerald-400" },
  design_agent_solutions:       { label: "design_agent_solutions",       color: "text-violet-400",  dot: "bg-violet-400" },
  compile_ideas:                { label: "compile_ideas",                color: "text-rose-300",    dot: "bg-rose-300" },
};

const LENS_COLORS: Record<string, string> = {
  competitor: "text-sky-300",
  workflow:   "text-amber-300",
  automation: "text-emerald-300",
  agent:      "text-violet-300",
};

function formatToolInput(tool: string, input: Record<string, unknown>): string {
  const keys = Object.keys(input ?? {});
  if (keys.length === 0) return "()";

  const parts: string[] = [];
  for (const key of keys) {
    const val = input[key];
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      parts.push(`${key}: [${val.length > 4 ? `${val.length} items` : val.map((v) => typeof v === "string" ? `"${v}"` : JSON.stringify(v)).join(", ")}]`);
    } else if (typeof val === "string") {
      parts.push(`${key}: "${val.length > 36 ? val.slice(0, 36) + "…" : val}"`);
    } else if (typeof val === "object") {
      parts.push(`${key}: {…}`);
    } else {
      parts.push(`${key}: ${val}`);
    }
  }
  if (parts.length === 0) return "()";
  return `(${parts.join(", ")})`;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

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

type RenderedEntry =
  | { kind: "turn_header"; id: string; turn: number }
  | { kind: "orchestrator"; id: string; text: string }
  | { kind: "trace"; id: string; text: string; isSeparator: boolean }
  | { kind: "tool_call"; id: string; tool: string; input: Record<string, unknown>; turn: number; pairedResultId?: string }
  | { kind: "tool_result"; id: string; tool: string; summary: string; details?: ToolResultDetail; turn: number; latencyMs?: number; pairedCallId?: string }
  | { kind: "theme"; id: string; rank: number; name: string; arr: number }
  | { kind: "idea"; id: string; lens: string; title: string }
  | { kind: "complete"; id: string; themes: number; customers: number; arr: number }
  | { kind: "idea_complete"; id: string; total: number }
  | { kind: "error"; id: string; message: string };

function buildView(entries: TraceEntry[]): RenderedEntry[] {
  // Pair tool_call ↔ tool_result by tool name in arrival order, and tag with current turn.
  const pendingByTool = new Map<string, { entryIndex: number; timestamp: number }>();
  const callTurnByIndex = new Map<number, number>();
  const latencyByCallIndex = new Map<number, number>();
  const pairedResultByCallIndex = new Map<number, string>();
  const pairedCallByResultIndex = new Map<number, string>();
  let currentTurn = 0;

  entries.forEach((entry, index) => {
    const ev = entry.event;
    if (ev.type === "trace" && /^Agent turn \d+/.test(ev.message)) {
      const m = ev.message.match(/^Agent turn (\d+)/);
      if (m) currentTurn = parseInt(m[1], 10);
    }
    if (ev.type === "tool_call") {
      pendingByTool.set(ev.tool, { entryIndex: index, timestamp: entry.timestamp });
      callTurnByIndex.set(index, currentTurn);
    }
    if (ev.type === "tool_result") {
      const pending = pendingByTool.get(ev.tool);
      if (pending) {
        latencyByCallIndex.set(pending.entryIndex, entry.timestamp - pending.timestamp);
        pairedResultByCallIndex.set(pending.entryIndex, entry.id);
        pairedCallByResultIndex.set(index, entries[pending.entryIndex].id);
        pendingByTool.delete(ev.tool);
      }
    }
  });

  const out: RenderedEntry[] = [];
  let turn = 0;

  entries.forEach((entry, index) => {
    const ev = entry.event;
    const id = entry.id;

    if (ev.type === "trace") {
      const turnMatch = ev.message.match(/^Agent turn (\d+)/);
      if (turnMatch) {
        turn = parseInt(turnMatch[1], 10);
        out.push({ kind: "turn_header", id, turn });
        return;
      }
      const isAgentReasoning = ev.message.startsWith("Agent:");
      if (isAgentReasoning) {
        out.push({ kind: "orchestrator", id, text: ev.message.replace(/^Agent:\s*/, "") });
        return;
      }
      const isSeparator = ev.message.startsWith("──");
      out.push({ kind: "trace", id, text: ev.message, isSeparator });
      return;
    }

    if (ev.type === "tool_call") {
      out.push({
        kind: "tool_call",
        id,
        tool: ev.tool,
        input: ev.input,
        turn: callTurnByIndex.get(index) ?? turn,
        pairedResultId: pairedResultByCallIndex.get(index),
      });
      return;
    }

    if (ev.type === "tool_result") {
      // Find call entry index for this result by reverse lookup
      const pairedCallId = pairedCallByResultIndex.get(index);
      // Latency is stored on the call's index; find that call's index for this result
      let latencyMs: number | undefined;
      if (pairedCallId) {
        const callIdx = entries.findIndex((e) => e.id === pairedCallId);
        if (callIdx !== -1) latencyMs = latencyByCallIndex.get(callIdx);
      }
      out.push({
        kind: "tool_result",
        id,
        tool: ev.tool,
        summary: ev.summary,
        details: ev.details,
        turn,
        latencyMs,
        pairedCallId,
      });
      return;
    }

    if (ev.type === "theme") {
      out.push({
        kind: "theme",
        id,
        rank: ev.data.rank,
        name: ev.data.theme_name,
        arr: ev.data.arr_at_risk,
      });
      return;
    }

    if (ev.type === "idea") {
      out.push({ kind: "idea", id, lens: ev.data.lens, title: ev.data.title });
      return;
    }

    if (ev.type === "complete") {
      out.push({
        kind: "complete",
        id,
        themes: ev.total_themes,
        customers: ev.total_customers,
        arr: ev.total_arr_at_risk,
      });
      return;
    }

    if (ev.type === "idea_complete") {
      out.push({ kind: "idea_complete", id, total: ev.total_ideas });
      return;
    }

    if (ev.type === "error") {
      out.push({ kind: "error", id, message: ev.message });
      return;
    }
  });

  return out;
}

export default function AgentTrace({
  entries,
  isRunning,
  isIdeating,
  onFollowUp,
  showDetailToggle,
  onSwitchToDetail,
  isDemo,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLive = isRunning || isIdeating;
  const isComplete = !isLive && entries.length > 0;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [followUpText, setFollowUpText] = useState("");
  const [inputVisible, setInputVisible] = useState(false);
  const prevIsLiveRef = useRef(isLive);

  // Fade in the follow-up input after run completes
  useEffect(() => {
    const wasLive = prevIsLiveRef.current;
    prevIsLiveRef.current = isLive;

    if (wasLive && !isLive && entries.length > 0) {
      // Small delay so the last entry has rendered, then fade in
      const t = setTimeout(() => setInputVisible(true), 100);
      return () => clearTimeout(t);
    }

    // Hide input immediately when a new run starts (schedule via timeout to avoid direct setState in effect)
    if (isLive) {
      const t = setTimeout(() => setInputVisible(false), 0);
      return () => clearTimeout(t);
    }
  }, [isLive, entries.length]);

  // Scroll to bottom on new entries
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  // Scroll down ~80px below last item when input becomes visible
  useEffect(() => {
    if (inputVisible && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [inputVisible]);

  const handleSubmit = useCallback(() => {
    const text = followUpText.trim();
    if (!text || !onFollowUp) return;
    setFollowUpText("");
    setInputVisible(false);
    onFollowUp(text);
  }, [followUpText, onFollowUp]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const view = useMemo(() => buildView(entries), [entries]);

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
        <div className="flex items-center gap-3">
          {showDetailToggle && onSwitchToDetail && (
            <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.06] rounded-md p-0.5">
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded bg-white/[0.12] text-white">
                Trace
              </span>
              <button
                type="button"
                onClick={onSwitchToDetail}
                className="text-[10px] font-semibold px-2.5 py-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
              >
                Detail
              </button>
            </div>
          )}
          {!isDemo && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-gray-700 font-mono">
              <span className="flex items-center gap-1">
                <Brain size={10} className="text-violet-400/70" />
                orchestrator
              </span>
              <span className="text-gray-800">·</span>
              <span className="flex items-center gap-1">
                <Cpu size={10} className="text-sky-400/70" />
                tools
              </span>
            </span>
          )}
          <span className="text-[10px] text-gray-700 font-mono">claude-sonnet-4-6</span>
        </div>
      </div>

      {/* Log */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 px-3 py-3 font-mono text-[11.5px] leading-relaxed"
      >
        {view.length === 0 && (
          <p className="text-gray-700 italic px-2">Waiting for agent...</p>
        )}

        {view.map((node) => {
          if (node.kind === "turn_header") {
            return (
              <div key={node.id} className="flex items-center gap-2 mt-3 mb-1.5 first:mt-0">
                <span className="text-[10px] font-bold text-violet-300/90 bg-violet-500/[0.08] border border-violet-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Agent turn {node.turn}
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
            );
          }

          if (node.kind === "orchestrator") {
            return (
              <div key={node.id} className="flex gap-2 items-start py-1 pl-1.5 border-l-2 border-violet-500/30 ml-2 mb-1">
                <Brain size={11} className="shrink-0 mt-0.5 text-violet-400/80" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-violet-400/70 uppercase tracking-wider mr-1.5">
                    orchestrator
                  </span>
                  <span className="text-gray-300">{node.text}</span>
                </div>
              </div>
            );
          }

          if (node.kind === "trace") {
            return (
              <div
                key={node.id}
                className={`flex gap-2 px-2 ${node.isSeparator ? "text-gray-700 pt-2" : "text-gray-500"}`}
              >
                {!node.isSeparator && <span className="text-gray-700 shrink-0 select-none">›</span>}
                <span>{node.text}</span>
              </div>
            );
          }

          if (node.kind === "tool_call") {
            const meta = TOOL_META[node.tool];
            const inputStr = formatToolInput(node.tool, node.input);
            return (
              <div
                key={node.id}
                className="flex gap-2 items-start pt-1.5 pl-3 ml-2 border-l border-white/[0.06]"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${meta?.dot ?? "bg-gray-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-1">
                    <span className="text-[9px] font-semibold text-gray-700 uppercase tracking-wider">
                      tool_use
                    </span>
                    <span className={`font-semibold ${meta?.color ?? "text-gray-300"}`}>
                      {meta?.label ?? node.tool}
                    </span>
                    <span className="text-gray-600 break-all">{inputStr}</span>
                  </div>
                </div>
              </div>
            );
          }

          if (node.kind === "tool_result") {
            const meta = TOOL_META[node.tool];
            const hasDetails = !!node.details;
            const isOpen = !!expanded[node.id];
            return (
              <div
                key={node.id}
                className="pl-3 ml-2 border-l border-white/[0.06] py-0.5"
              >
                <button
                  type="button"
                  disabled={!hasDetails}
                  onClick={() =>
                    hasDetails && setExpanded((p) => ({ ...p, [node.id]: !p[node.id] }))
                  }
                  className={`flex gap-2 items-start text-left w-full pl-3 ${
                    hasDetails ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span className="shrink-0 select-none text-emerald-500 leading-snug">↳</span>
                  {hasDetails && (
                    <ChevronRight
                      size={11}
                      className={`shrink-0 mt-0.5 text-gray-700 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-[9px] font-semibold text-gray-700 uppercase tracking-wider">
                        tool_result
                      </span>
                      <span className={`text-[10px] font-mono ${meta?.color ?? "text-gray-400"} opacity-70`}>
                        {meta?.label ?? node.tool}
                      </span>
                      {typeof node.latencyMs === "number" && (
                        <span className="text-[10px] text-gray-700 font-mono">
                          · {formatLatency(node.latencyMs)}
                        </span>
                      )}
                    </div>
                    <span className="text-emerald-400/90 leading-snug">{node.summary}</span>
                  </div>
                </button>
                {hasDetails && isOpen && node.details && (
                  <div className="mt-1.5 ml-8 px-3 py-2.5 rounded-md border border-white/[0.05] bg-white/[0.02]">
                    <DetailBlock details={node.details} />
                  </div>
                )}
              </div>
            );
          }

          if (node.kind === "theme") {
            return (
              <div key={node.id} className="flex gap-2 items-baseline pt-1 px-2">
                <span className="text-violet-500 shrink-0 select-none">◆</span>
                <span className="text-violet-300 font-medium">#{node.rank}</span>
                <span className="text-gray-200">{node.name}</span>
                <span className="text-gray-600 ml-1">
                  ${(node.arr / 1000).toFixed(0)}K at risk
                </span>
              </div>
            );
          }

          if (node.kind === "idea") {
            const lensColor = LENS_COLORS[node.lens] ?? "text-gray-200";
            return (
              <div key={node.id} className="flex gap-2 items-baseline pt-1 px-2">
                <span className="text-indigo-500 shrink-0 select-none">◈</span>
                <span className={`font-medium ${lensColor}`}>[{node.lens}]</span>
                <span className="text-gray-200">{node.title}</span>
              </div>
            );
          }

          if (node.kind === "complete") {
            return (
              <div key={node.id} className="mt-3 pt-3 border-t border-white/[0.06] px-2">
                <div className="text-emerald-400 font-semibold">✓ Analysis complete</div>
                <div className="text-gray-500 mt-0.5">
                  {node.themes} themes · {node.customers} customers · ${(node.arr / 1_000_000).toFixed(1)}M ARR
                </div>
              </div>
            );
          }

          if (node.kind === "idea_complete") {
            return (
              <div key={node.id} className="mt-3 pt-3 border-t border-white/[0.06] px-2">
                <div className="text-indigo-400 font-semibold">◈ Ideation complete</div>
                <div className="text-gray-500 mt-0.5">{node.total} ideas generated</div>
              </div>
            );
          }

          if (node.kind === "error") {
            return (
              <div key={node.id} className="text-red-400 mt-2 px-2">
                ✗ {node.message}
              </div>
            );
          }

          return null;
        })}

        {isLive && (
          <div className="flex gap-0.5 mt-2 text-gray-700 px-2">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
          </div>
        )}

        {/* Spacer so there's room below the last item when the follow-up bar is visible */}
        {isComplete && <div style={{ height: 80 }} />}

        <div ref={bottomRef} />
      </div>

      {/* Sticky follow-up input — fades in after run completes */}
      {isComplete && onFollowUp && (
        <div
          className="shrink-0 px-3 pb-3 pt-2 border-t border-white/[0.06] bg-[#0c0c0e]"
          style={{
            opacity: inputVisible ? 1 : 0,
            transition: "opacity 200ms ease-in",
            pointerEvents: inputVisible ? "auto" : "none",
          }}
        >
          <textarea
            rows={2}
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up, or describe a new analysis..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-white/[0.18] resize-none transition-colors leading-relaxed font-mono"
          />
        </div>
      )}
    </div>
  );
}
