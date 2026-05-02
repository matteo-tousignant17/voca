"use client";

import { useState, useCallback, useId } from "react";
import AgentTrace from "@/components/AgentTrace";
import OutputPanel from "@/components/OutputPanel";
import type { BriefItem, AgentEvent } from "@/lib/agent";

type TraceEntry = {
  id: string;
  event: AgentEvent;
  timestamp: number;
};

const SOURCES = [
  { id: "reddit", label: "Reddit", icon: "🟠", description: "r/Notion community posts" },
  { id: "g2", label: "G2 Reviews", icon: "⭐", description: "10 verified reviews" },
  { id: "gong", label: "Gong Calls", icon: "📞", description: "4 CS & sales calls" },
  { id: "support_tickets", label: "Support Tickets", icon: "🎫", description: "12 open tickets" },
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
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const totalFeedbackItems =
    (selectedSources.includes("reddit") ? 15 : 0) +
    (selectedSources.includes("g2") ? 10 : 0) +
    (selectedSources.includes("gong") ? 4 : 0) +
    (selectedSources.includes("support_tickets") ? 12 : 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold">
              V
            </div>
            <div>
              <div className="font-semibold text-white leading-none">VoC Agent</div>
              <div className="text-xs text-gray-500 mt-0.5">Voice of Customer · Powered by Claude</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Demo: Notion</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>$8M ARR · 750 customers</span>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto w-full px-6 py-6 flex flex-col gap-6 flex-1">
        {/* Control bar */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {SOURCES.map((src) => {
              const active = selectedSources.includes(src.id);
              return (
                <button
                  key={src.id}
                  onClick={() => toggleSource(src.id)}
                  disabled={isRunning}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    active
                      ? "bg-gray-800 border-gray-600 text-white"
                      : "bg-transparent border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span>{src.icon}</span>
                  <span>{src.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-gray-600 hidden sm:block">
            {totalFeedbackItems} feedback items
          </div>

          <div className="ml-auto">
            <button
              onClick={handleAnalyze}
              disabled={isRunning || selectedSources.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/30"
            >
              {isRunning ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Run VoC Agent
                </>
              )}
            </button>
          </div>
        </div>

        {/* Split view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1" style={{ minHeight: "calc(100vh - 200px)" }}>
          <AgentTrace entries={traceEntries} isRunning={isRunning} />
          <OutputPanel themes={themes} isRunning={isRunning} isComplete={isComplete} summary={summary} />
        </div>
      </div>
    </div>
  );
}
