"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { HistoryEntry } from "@/lib/history";
import { loadHistory, persistHistory, loadReports, persistReports } from "@/lib/history";

type HistoryContextValue = {
  history: HistoryEntry[];
  reports: HistoryEntry[];
  addToHistory: (entry: HistoryEntry) => void;
  saveReport: (entry: HistoryEntry) => void;
  isReport: (id: string) => boolean;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [reports, setReports] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
    setReports(loadReports());
  }, []);

  const addToHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const updated = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, 20);
      persistHistory(updated);
      return updated;
    });
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

  return (
    <HistoryContext.Provider value={{ history, reports, addToHistory, saveReport, isReport }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
