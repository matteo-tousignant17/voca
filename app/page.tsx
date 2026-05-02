"use client";

import { useState, useCallback, useId, useRef } from "react";
import { Zap, Square } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AgentTrace from "@/components/AgentTrace";
import OutputPanel from "@/components/OutputPanel";
import FocusPane from "@/components/FocusPane";
import { useHistory } from "@/context/HistoryContext";
import type { BriefItem, AgentEvent } from "@/lib/agent";
import type { IdeaItem, IdeaEvent } from "@/lib/ideate";

type AnyEvent = AgentEvent | IdeaEvent;

type TraceEntry = {
  id: string;
  event: AnyEvent;
  timestamp: number;
};

export default function Home() {
  const [selectedSources] = useState<string[]>(["reddit", "g2", "gong", "support_tickets"]);
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
  const prefix = useId();
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef<string>(`run-${Date.now()}`);
  const themesRef = useRef<BriefItem[]>([]);

  const { addToHistory } = useHistory();

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
    runIdRef.current = `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    themesRef.current = [];
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
        body: JSON.stringify({ sources: selectedSources, focus: focusToSend }),
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
            const event = JSON.parse(payload) as AgentEvent;
            addTrace(event);

            if (event.type === "theme") {
              setThemes((prev) => {
                const exists = prev.some((t) => t.theme_name === event.data.theme_name);
                if (exists) return prev;
                const updated = [...prev, event.data]
                  .sort((a, b) => b.arr_at_risk - a.arr_at_risk)
                  .map((t, i) => ({ ...t, rank: i + 1 }));
                themesRef.current = updated;
                return updated;
              });
            }

            if (event.type === "complete") {
              const summaryData = {
                total_themes: event.total_themes,
                total_arr_at_risk: event.total_arr_at_risk,
                total_customers: event.total_customers,
              };
              setIsComplete(true);
              setSummary(summaryData);
              addToHistory({
                id: runIdRef.current,
                timestamp: Date.now(),
                sources: selectedSources,
                focus: focusToSend,
                summary: summaryData,
                themes: themesRef.current,
                ideas: [],
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
  }, [isRunning, selectedSources, selectedFocus, customFocus, addTrace, addToHistory]);

  const handleIdeate = useCallback(async () => {
    if (isIdeating || !isComplete || themes.length === 0) return;
    setIdeas([]);
    setIsIdeateComplete(false);
    setIsIdeating(true);
    abortRef.current = new AbortController();
    addTrace({ type: "trace", message: "── Ideation phase ────────────────────" });

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

  return (
    <div className="flex h-screen overflow-hidden bg-[#090909]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-sm">
          <div>
            <h1 className="text-sm font-semibold text-white">Analyze</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={isRunning || isIdeating ? handleStop : handleAnalyze}
              disabled={!isRunning && !isIdeating && selectedSources.length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isRunning || isIdeating
                  ? "bg-red-600/80 hover:bg-red-600"
                  : "bg-violet-600 hover:bg-violet-500"
              }`}
            >
              {isRunning || isIdeating ? (
                <>
                  <Square size={11} />
                  Stop
                </>
              ) : (
                <>
                  <Zap size={12} />
                  Run Agent
                </>
              )}
            </button>
          </div>
        </header>

        {/* Split view — trace:output 35:65 */}
        <div className="flex-1 grid grid-cols-[35fr_65fr] gap-0 min-h-0 overflow-hidden">
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
