"use client";

import { useState, useCallback, useId } from "react";
import { Zap, ChevronDown } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AgentTrace from "@/components/AgentTrace";
import OutputPanel from "@/components/OutputPanel";
import type { BriefItem, AgentEvent } from "@/lib/agent";

type TraceEntry = {
  id: string;
  event: AgentEvent;
  timestamp: number;
};

const SOURCES = [
  { id: "reddit", label: "Reddit", count: 15 },
  { id: "g2", label: "G2 Reviews", count: 10 },
  { id: "gong", label: "Gong", count: 4 },
  { id: "support_tickets", label: "Support", count: 12 },
];

export default function Home() {
  const [selectedSources, setSelectedSources] = useState<string[]>(["reddit", "g2", "gong", "support_tickets"]);
  const [traceEntries, setTraceEntries] = useState<TraceEntry[]>([]);
  const [themes, setThemes] = useState<BriefItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState<{ total_themes: number; total_arr_at_risk: number; total_customers: number } | null>(null);
  const prefix = useId();

  const addTrace = useCallback((event: AgentEvent) => {
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
    setIsRunning(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: selectedSources }),
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
                const updated = [...prev, event.data];
                return updated.sort((a, b) => b.arr_at_risk - a.arr_at_risk).map((t, i) => ({ ...t, rank: i + 1 }));
              });
            }

            if (event.type === "complete") {
              setIsComplete(true);
              setSummary({ total_themes: event.total_themes, total_arr_at_risk: event.total_arr_at_risk, total_customers: event.total_customers });
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      addTrace({ type: "error", message: String(err) });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, selectedSources, addTrace]);

  const toggleSource = (id: string) => {
    if (isRunning) return;
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const totalItems = SOURCES.filter((s) => selectedSources.includes(s.id)).reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex h-screen overflow-hidden bg-[#090909]">
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-sm font-semibold text-white">Analyze</h1>
              <p className="text-[11px] text-gray-500 leading-none mt-0.5">Synthesize feedback · prioritize by ARR</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Source toggles */}
            <div className="flex items-center gap-1.5">
              {SOURCES.map((src) => {
                const active = selectedSources.includes(src.id);
                return (
                  <button
                    key={src.id}
                    onClick={() => toggleSource(src.id)}
                    disabled={isRunning}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all disabled:cursor-not-allowed ${
                      active
                        ? "bg-white/[0.07] border-white/[0.12] text-gray-200"
                        : "bg-transparent border-transparent text-gray-600 hover:text-gray-400 hover:border-white/[0.06]"
                    }`}
                  >
                    {src.label}
                    <span className={`text-[10px] ${active ? "text-gray-500" : "text-gray-700"}`}>
                      {src.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-white/[0.08]" />

            {/* Item count */}
            <span className="text-xs text-gray-600">{totalItems} items</span>

            <div className="w-px h-5 bg-white/[0.08]" />

            {/* Run button */}
            <button
              onClick={handleAnalyze}
              disabled={isRunning || selectedSources.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Running...
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

        {/* Split view */}
        <div className="flex-1 grid grid-cols-2 gap-0 min-h-0 overflow-hidden">
          {/* Left: agent trace */}
          <div className="flex flex-col min-h-0 border-r border-white/[0.06]">
            <AgentTrace entries={traceEntries} isRunning={isRunning} />
          </div>
          {/* Right: output */}
          <div className="flex flex-col min-h-0">
            <OutputPanel themes={themes} isRunning={isRunning} isComplete={isComplete} summary={summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
