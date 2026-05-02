"use client";

import { useState, useCallback, useId, useRef, useEffect } from "react";
import { Zap, Square } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AgentTrace from "@/components/AgentTrace";
import OutputPanel from "@/components/OutputPanel";
import FocusPane from "@/components/FocusPane";
import IdeatePane from "@/components/IdeatePane";
import ThemeDetailPane from "@/components/ThemeDetailPane";
import { useHistory } from "@/context/HistoryContext";
import { useAgentMode } from "@/lib/settings";
import type { BriefItem, AgentEvent } from "@/lib/agent";
import type { IdeaItem, IdeaEvent } from "@/lib/ideate";
import type { SavedTheme } from "@/lib/history";

type AnyEvent = AgentEvent | IdeaEvent;

type TraceEntry = {
  id: string;
  event: AnyEvent;
  timestamp: number;
};

type MiddlePanelMode = "trace" | "detail";

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

  // Feature 1: saved theme highlight
  const [highlightedThemeName, setHighlightedThemeName] = useState<string | null>(null);

  // Feature 2: detail pane
  const [activeDetailTheme, setActiveDetailTheme] = useState<BriefItem | null>(null);
  const [middlePanelMode, setMiddlePanelMode] = useState<MiddlePanelMode>("trace");

  // Feature 3: ideate pane
  const [ideateSeededTheme, setIdeateSeededTheme] = useState<BriefItem | null>(null);
  const [ideatePrompt, setIdeatePrompt] = useState("");
  const [showIdeatePane, setShowIdeatePane] = useState(false);

  const prefix = useId();
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef<string>(`run-${Date.now()}`);
  const themesRef = useRef<BriefItem[]>([]);
  const mode = useAgentMode();

  const {
    addToHistory,
    saveTheme,
    unsaveTheme,
    isThemeSaved,
    savedThemes,
    registerRestoreHandler,
  } = useHistory();

  const savedThemeKeys = new Set(savedThemes.map((s) => s.themeKey));

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

  const handleAnalyze = useCallback(async (focusOverride?: string, appendHistory?: boolean) => {
    if (isRunning) return;
    runIdRef.current = `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    themesRef.current = [];
    if (!appendHistory) {
      setTraceEntries([]);
    }
    setThemes([]);
    setIsComplete(false);
    setSummary(null);
    setIdeas([]);
    setIsIdeating(false);
    setIsIdeateComplete(false);
    setIsRunning(true);
    setHighlightedThemeName(null);
    setActiveDetailTheme(null);
    setMiddlePanelMode("trace");
    setShowIdeatePane(false);
    abortRef.current = new AbortController();

    const focusToSend = focusOverride ?? (selectedFocus === "custom" ? customFocus : selectedFocus);

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
  }, [isRunning, selectedSources, selectedFocus, customFocus, addTrace, addToHistory, mode]);

  const handleFollowUp = useCallback((text: string) => {
    addTrace({ type: "trace", message: "── Follow-up ────────────────────────" });
    handleAnalyze(text, /* appendHistory */ true);
  }, [addTrace, handleAnalyze]);

  // --- Ideation ---
  const runIdeation = useCallback(
    async (themesToUse: BriefItem[], focus?: string) => {
      if (isIdeating) return;
      setIdeas([]);
      setIsIdeateComplete(false);
      setIsIdeating(true);
      abortRef.current = new AbortController();
      if (focus) {
        addTrace({ type: "trace", message: "── Ideation phase (focused) ──────────" });
      } else {
        addTrace({ type: "trace", message: "── Ideation phase ────────────────────" });
      }

      try {
        const res = await fetch("/api/ideate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ themes: themesToUse, focus }),
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
    },
    [isIdeating, addTrace]
  );

  const handleIdeate = useCallback(async () => {
    if (isIdeating || !isComplete || themes.length === 0) return;
    await runIdeation(themes);
  }, [isIdeating, isComplete, themes, runIdeation]);

  // Feature 1: save/unsave
  const handleSaveTheme = useCallback(
    (theme: BriefItem) => {
      if (!summary) return;
      if (isThemeSaved(theme.theme_name)) {
        unsaveTheme(theme.theme_name);
      } else {
        saveTheme(theme, { themes, summary }, runIdRef.current);
      }
    },
    [summary, themes, isThemeSaved, saveTheme, unsaveTheme]
  );

  // Feature 1: restore from sidebar
  const handleRestoreSession = useCallback(
    (saved: SavedTheme) => {
      setThemes(saved.sessionSnapshot.themes);
      themesRef.current = saved.sessionSnapshot.themes;
      setSummary(saved.sessionSnapshot.summary);
      setIsComplete(true);
      setIsRunning(false);
      setIsIdeating(false);
      setIsIdeateComplete(false);
      setIdeas([]);
      setHighlightedThemeName(saved.themeKey);
      setActiveDetailTheme(null);
      setMiddlePanelMode("trace");
      setShowIdeatePane(false);
      runIdRef.current = saved.sessionId;
    },
    []
  );

  // Register the restore bridge so Sidebar can trigger restore from context
  useEffect(() => {
    registerRestoreHandler(handleRestoreSession);
    return () => registerRestoreHandler(null);
  }, [registerRestoreHandler, handleRestoreSession]);

  // Feature 2: open detail on card body click
  const handleThemeBodyClick = useCallback((theme: BriefItem) => {
    setActiveDetailTheme(theme);
    setMiddlePanelMode("detail");
    setShowIdeatePane(false);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setActiveDetailTheme(null);
    setMiddlePanelMode("trace");
  }, []);

  // Feature 3: per-theme ideate trigger
  const handleIdeateTheme = useCallback((theme: BriefItem) => {
    setIdeateSeededTheme(theme);
    setIdeatePrompt(`${theme.theme_name}: ${theme.problem_statement}`);
    setShowIdeatePane(true);
    setMiddlePanelMode("trace");
  }, []);

  const handleRunFocusedIdeation = useCallback(async () => {
    const prompt = ideatePrompt.trim();
    if (!prompt || isIdeating) return;
    setShowIdeatePane(false);
    // Put the seeded theme first so it definitely makes the top-3 slice
    const orderedThemes = ideateSeededTheme
      ? [ideateSeededTheme, ...themes.filter((t) => t.theme_name !== ideateSeededTheme.theme_name)]
      : themes;
    await runIdeation(orderedThemes, prompt);
  }, [ideatePrompt, isIdeating, ideateSeededTheme, themes, runIdeation]);

  const handleCancelIdeate = useCallback(() => {
    setShowIdeatePane(false);
  }, []);

  // Middle-panel slot priority:
  //   if (!showTrace && !showIdeatePane)          → FocusPane
  //   else if (showIdeatePane)                    → IdeatePane
  //   else if (middlePanelMode === "detail")      → ThemeDetailPane
  //   else                                        → AgentTrace
  let middlePanel: React.ReactNode;
  if (!showTrace && !showIdeatePane) {
    middlePanel = (
      <FocusPane
        selectedFocus={selectedFocus}
        customFocus={customFocus}
        onSelectFocus={setSelectedFocus}
        onCustomFocus={setCustomFocus}
        onRun={() => handleAnalyze()}
        disabled={selectedSources.length === 0}
      />
    );
  } else if (showIdeatePane) {
    middlePanel = (
      <IdeatePane
        seedTheme={ideateSeededTheme}
        prompt={ideatePrompt}
        onPromptChange={setIdeatePrompt}
        onRun={handleRunFocusedIdeation}
        onCancel={handleCancelIdeate}
        disabled={isIdeating || !ideatePrompt.trim() || themes.length === 0}
      />
    );
  } else if (middlePanelMode === "detail" && activeDetailTheme) {
    middlePanel = (
      <ThemeDetailPane
        key={activeDetailTheme.theme_name}
        theme={activeDetailTheme}
        allThemes={themes}
        mode={middlePanelMode}
        onModeChange={(m) => {
          if (m === "trace" && traceEntries.length === 0) return;
          setMiddlePanelMode(m);
        }}
        onSelectTheme={(t) => setActiveDetailTheme(t)}
        onClose={handleCloseDetail}
        hasTrace={traceEntries.length > 0}
        onIdeate={handleIdeateTheme}
        ideateDisabled={isIdeating || !isComplete}
      />
    );
  } else {
    middlePanel = (
      <AgentTrace
        entries={traceEntries}
        isRunning={isRunning}
        isIdeating={isIdeating}
        onFollowUp={handleFollowUp}
        showDetailToggle={!!activeDetailTheme}
        onSwitchToDetail={
          activeDetailTheme ? () => setMiddlePanelMode("detail") : undefined
        }
      />
    );
  }

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
            <button
              onClick={isRunning || isIdeating ? handleStop : () => handleAnalyze()}
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
          {/* Left: FocusPane / IdeatePane / ThemeDetailPane / AgentTrace */}
          <div className="flex flex-col min-h-0 border-r border-white/[0.06]">
            {middlePanel}
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
              savedThemeKeys={savedThemeKeys}
              onSaveTheme={handleSaveTheme}
              highlightedThemeName={highlightedThemeName}
              activeDetailThemeName={activeDetailTheme?.theme_name ?? null}
              onThemeBodyClick={handleThemeBodyClick}
              onIdeateTheme={handleIdeateTheme}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
