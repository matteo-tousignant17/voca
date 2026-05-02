import type { BriefItem } from "./agent";
import type { IdeaItem } from "./ideate";

export type HistoryEntry = {
  id: string;
  timestamp: number;
  sources: string[];
  summary: {
    total_themes: number;
    total_arr_at_risk: number;
    total_customers: number;
  };
  themes: BriefItem[];
  ideas: IdeaItem[];
};

export const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  g2: "G2 Reviews",
  gong: "Gong",
  support_tickets: "Support",
};

const HISTORY_KEY = "voca_history";
const REPORTS_KEY = "voca_reports";

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function persistHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export function loadReports(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function persistReports(entries: HistoryEntry[]): void {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(entries));
}

export function formatARR(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
