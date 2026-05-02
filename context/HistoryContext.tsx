"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { HistoryEntry, SavedTheme } from "@/lib/history";
import type { BriefItem } from "@/lib/agent";
import {
  loadHistory,
  persistHistory,
  loadReports,
  persistReports,
  loadSavedThemes,
  persistSavedThemes,
} from "@/lib/history";

type RestoreHandler = (saved: SavedTheme) => void;

type HistoryContextValue = {
  history: HistoryEntry[];
  reports: HistoryEntry[];
  addToHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  saveReport: (entry: HistoryEntry) => void;
  isReport: (id: string) => boolean;
  savedThemes: SavedTheme[];
  saveTheme: (theme: BriefItem, sessionSnapshot: SavedTheme["sessionSnapshot"], sessionId?: string) => void;
  unsaveTheme: (themeKey: string) => void;
  isThemeSaved: (themeKey: string) => boolean;
  registerRestoreHandler: (handler: RestoreHandler | null) => void;
  restoreSession: (saved: SavedTheme) => void;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [reports, setReports] = useState<HistoryEntry[]>([]);
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);
  const restoreHandlerRef = useRef<RestoreHandler | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
    setReports(loadReports());
    setSavedThemes(loadSavedThemes());
  }, []);

  const addToHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const updated = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, 20);
      persistHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    persistHistory([]);
  }, []);

  const saveReport = useCallback((entry: HistoryEntry) => {
    setReports((prev) => {
      if (prev.some((r) => r.id === entry.id)) return prev;
      const updated = [entry, ...prev];
      persistReports(updated);
      return updated;
    });
  }, []);

  const isReport = useCallback((id: string) => reports.some((r) => r.id === id), [reports]);

  const saveTheme = useCallback(
    (theme: BriefItem, sessionSnapshot: SavedTheme["sessionSnapshot"], sessionId?: string) => {
      setSavedThemes((prev) => {
        const themeKey = theme.theme_name;
        if (prev.some((s) => s.themeKey === themeKey)) return prev;
        const entry: SavedTheme = {
          themeKey,
          theme,
          sessionId: sessionId ?? `session-${Date.now()}`,
          sessionSnapshot,
          savedAt: Date.now(),
        };
        const updated = [entry, ...prev];
        persistSavedThemes(updated);
        return updated;
      });
    },
    []
  );

  const unsaveTheme = useCallback((themeKey: string) => {
    setSavedThemes((prev) => {
      const updated = prev.filter((s) => s.themeKey !== themeKey);
      persistSavedThemes(updated);
      return updated;
    });
  }, []);

  const isThemeSaved = useCallback(
    (themeKey: string) => savedThemes.some((s) => s.themeKey === themeKey),
    [savedThemes]
  );

  const registerRestoreHandler = useCallback((handler: RestoreHandler | null) => {
    restoreHandlerRef.current = handler;
  }, []);

  const restoreSession = useCallback((saved: SavedTheme) => {
    restoreHandlerRef.current?.(saved);
  }, []);

  return (
    <HistoryContext.Provider
      value={{
        history,
        reports,
        addToHistory,
        clearHistory,
        saveReport,
        isReport,
        savedThemes,
        saveTheme,
        unsaveTheme,
        isThemeSaved,
        registerRestoreHandler,
        restoreSession,
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
