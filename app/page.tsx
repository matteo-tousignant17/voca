"use client";

import { useState, useCallback, useId, useRef, useMemo } from "react";
import { Square } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AgentTrace from "@/components/AgentTrace";
import OutputPanel from "@/components/OutputPanel";
import FocusPane from "@/components/FocusPane";
import type { BriefItem, AgentEvent } from "@/lib/agent";
import type { IdeaItem, IdeaEvent } from "@/lib/ideate";
import { saveRun } from "@/lib/history";
import { useAgentMode } from "@/lib/settings";
import { DEMO_SOURCES } from "@/lib/demo_sources";

type AnyEvent = AgentEvent | IdeaEvent;

type TraceEntry = {
  id: string;
  event: AnyEvent;
  timestamp: number;
};

type SourceOption = {
  id: string;
  label: string;
  count: number;
  badge_bg?: string;
  badge_text?: string;
  initial?: string;
  initial_bg?: string;
};

const LIVE_SOURCES: SourceOption[] = [
  { id: "reddit", label: "Reddit", count: 35 },
  { id: "g2", label: "G2", count: 25 },
  { id: "gong", label: "Gong", count: 14 },
  { id: "support_tickets", label: "Support", count: 28 },
];

const DEMO_SOURCE_OPTIONS: SourceOption[] = DEMO_SOURCES.map((s) => ({
  id: s.id,
  label: s.short_label,
  count: s.count,
  badge_bg: s.badge_bg,
  badge_text: s.badge_text,
  initial: s.initial,
  initial_bg: s.initial_bg,
}));

export default function Home() {
  const [liveSelected, setLiveSelected] = useState<string[]>([
    "reddit", "g2", "gong", "support_tickets",
  ]);
  const [demoSelected, setDemoSelected] = useState<string[]>(
    DEMO_SOURCE_OPTIONS.map((s) => s.id),
  );
  const [selectedFocus, setSelectedFocus] = useState("general");
  const [customFocus, setCustomFocus] = useState("");
  const [traceEntries, setTraceEntries] = useState<TraceEntry[]>([]);
  const [themes, setThemes] = useState<BriefItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState<{ total_themes: number; total_arr_at_risk: number; total_customers: number } | null>(null);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [isIdeating, setIsIdeating] = useState(false);
  const [isIdeateComplete, setIsIdeateComplete] = useState(false);
  const mode = useAgentMode();
  const prefix = useId();
  const abortRef = useRef<AbortController | null>(null);

  const sourceOptions: SourceOption[] = mode === "demo" ? DEMO_SOURCE_OPTIONS : LIVE_SOURCES;
  const selectedSources = mode === "demo" ? demoSelected : liveSelected;
  const setSelectedSources = mode === "demo" ? setDemoSelected : setLiveSelected;

  // Left panel shows FocusPane when idle, AgentTrace when active
  const showTrace = isRunning || isIdeating || traceEntries.length > 0;

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const addTrace = useCallback((event: AnyEvent) => {
    setTraceEntries((prev) => [
      ...prev,
      { id: `${prefix}-${Date.now()}-${Math.random()}`, event, timestamp: Date.now() },
    ]);
  }, [prefix]);

  const handleAnalyze = useCallback(async () => {
    if (isRunning) return;
    setTraceEntries([]);
    setThemes([]);
    setIsComplete(false);
    setSummary(null);
    setIdeas([]);
    setIsIdeating(false);
    setIsIdeateComplete(false);
    setIsRunning(true);
    abortRef.current = new AbortController();

    const focusToSend = selectedFocus === "custom" ? customFocus : selectedFocus;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: selectedSources, focus: focusToSend, mode }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let latestThemes: BriefItem[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;

          try {
            const event = JSON.parse(payload) as AgentEvent;
            addTrace(event);

            if (event.type === "theme") {
              setThemes((prev) => {
                const exists = prev.some((t) => t.theme_name === event.data.theme_name);
                if (exists) return prev;
                const updated = [...prev, event.data];
                const sorted = updated.sort((a, b) => b.arr_at_risk - a.arr_at_risk).map((t, i) => ({ ...t, rank: i + 1 }));
                latestThemes = sorted;
                return sorted;
              });
            }

            if (event.type === "complete") {
              setIsComplete(true);
              setSummary({ total_themes: event.total_themes, total_arr_at_risk: event.total_arr_at_risk, total_customers: event.total_customers });
              saveRun({
                timestamp: Date.now(),
                sources: selectedSources,
                focus: focusToSend,
                theme_count: event.total_themes,
                arr_at_risk: event.total_arr_at_risk,
                top_theme: latestThemes[0]?.theme_name ?? "",
              });
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        addTrace({ type: "trace", message: "— Stopped." });
      } else {
        addTrace({ type: "error", message: String(err) });
      }
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, selectedSources, selectedFocus, customFocus, addTrace, mode]);

  const handleIdeate = useCallback(async () => {
    if (isIdeating || !isComplete || themes.length === 0) return;
    setIdeas([]);
    setIsIdeateComplete(false);
    setIsIdeating(true);
    abortRef.current = new AbortController();
    addTrace({ type: "trace", message: "── Ideation phase ──────────────────" });

    try {
      const res = await fetch("/api/ideate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themes }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;

          try {
            const event = JSON.parse(payload) as IdeaEvent;
            addTrace(event);
            if (event.type === "idea") setIdeas((prev) => [...prev, event.data]);
            if (event.type === "idea_complete") setIsIdeateComplete(true);
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        addTrace({ type: "trace", message: "— Stopped." });
      } else {
        addTrace({ type: "error", message: String(err) });
      }
    } finally {
      setIsIdeating(false);
    }
  }, [isIdeating, isComplete, themes, addTrace]);

  const toggleSource = (id: string) => {
    if (isRunning || isIdeating) return;
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const totalItems = useMemo(
    () =>
      sourceOptions
        .filter((s) => selectedSources.includes(s.id))
        .reduce((sum, s) => sum + s.count, 0),
    [sourceOptions, selectedSources],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#090909]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-sm font-semibold text-white">Analyze</h1>
              <p className="text-[11px] text-gray-500 leading-none mt-0.5">Synthesize feedback · prioritize by ARR</p>
            </div>
            {mode === "demo" && (
              <span
                className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/[0.08] border border-emerald-500/20 px-2 py-0.5 rounded-md"
                title="Deterministic playback — change in Settings"
              >
                DEMO MODE
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {sourceOptions.map((src) => {
                const active = selectedSources.includes(src.id);
                const showInitial = mode === "demo" && src.initial && src.initial_bg;
                return (
                  <button
                    key={src.id}
                    onClick={() => toggleSource(src.id)}
                    disabled={isRunning || isIdeating}
                    className={`flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md text-xs font-medium border transition-all disabled:cursor-not-allowed ${
                      active
                        ? "bg-white/[0.07] border-white/[0.12] text-gray-200"
                        : "bg-transparent border-transparent text-gray-600 hover:text-gray-400 hover:border-white/[0.06]"
                    }`}
                    title={src.label}
                  >
                    {showInitial ? (
                      <span
                        className={`w-4 h-4 rounded ${src.initial_bg} flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${active ? "opacity-100" : "opacity-50"}`}
                      >
                        {src.initial}
                      </span>
                    ) : null}
                    <span>{src.label}</span>
                    <span className={`text-[10px] ${active ? "text-gray-500" : "text-gray-700"}`}>
                      {src.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-white/[0.08]" />
            <span className="text-xs text-gray-600">{totalItems} items</span>
            <div className="w-px h-5 bg-white/[0.08]" />

            {(isRunning || isIdeating) && (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-red-600/80 hover:bg-red-600 text-white transition-colors"
              >
                <Square size={11} />
                Stop
              </button>
            )}
          </div>
        </header>

        {/* Split view */}
        <div className="flex-1 grid grid-cols-2 gap-0 min-h-0 overflow-hidden">
          {/* Left: FocusPane (idle) or AgentTrace (active) */}
          <div className="flex flex-col min-h-0 border-r border-white/[0.06]">
            {showTrace ? (
              <AgentTrace entries={traceEntries} isRunning={isRunning} isIdeating={isIdeating} />
            ) : (
              <FocusPane
                selectedFocus={selectedFocus}
                customFocus={customFocus}
                onSelectFocus={setSelectedFocus}
                onCustomFocus={setCustomFocus}
                onRun={handleAnalyze}
                disabled={selectedSources.length === 0}
              />
            )}
          </div>
          {/* Right: output */}
          <div className="flex flex-col min-h-0">
            <OutputPanel
              themes={themes}
              isRunning={isRunning}
              isComplete={isComplete}
              summary={summary}
              ideas={ideas}
              isIdeating={isIdeating}
              isIdeateComplete={isIdeateComplete}
              onIdeate={handleIdeate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
