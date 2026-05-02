export type HistoryRun = {
  id: string;
  timestamp: number;
  sources: string[];
  focus: string;
  theme_count: number;
  arr_at_risk: number;
  top_theme: string;
};

const KEY = "voc_history";
const MAX = 20;

export function saveRun(run: Omit<HistoryRun, "id">): HistoryRun {
  const entry: HistoryRun = { ...run, id: `run_${Date.now()}` };
  try {
    const prev = loadHistory();
    const updated = [entry, ...prev].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable (SSR or private browsing)
  }
  return entry;
}

export function loadHistory(): HistoryRun[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryRun[]) : [];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
