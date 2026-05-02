"use client";

import { useState, useEffect } from "react";
import { Clock, Trash2, Zap } from "lucide-react";
import { loadHistory, clearHistory, type HistoryRun } from "@/lib/history";

const FOCUS_OPTIONS = [
  {
    id: "general",
    label: "General synthesis",
    description: "Synthesize all feedback and surface the top themes by impact.",
    prompt: "general",
    icon: "◈",
    color: "text-violet-400",
    border: "hover:border-violet-500/30",
  },
  {
    id: "recent",
    label: "Recent issues",
    description: "Prioritize feedback from the last 30 days to catch emerging problems.",
    prompt: "Focus specifically on the most recently reported feedback and emerging patterns. Weight recent evidence more heavily than older feedback.",
    icon: "🕐",
    color: "text-sky-400",
    border: "hover:border-sky-500/30",
  },
  {
    id: "highest_value",
    label: "Highest-value accounts",
    description: "Surface issues that affect the most ARR-at-risk customers first.",
    prompt: "Prioritize themes that affect enterprise and mid-market accounts. Weight issues that appear in Gong calls and support tickets from high-ARR customers most heavily.",
    icon: "💰",
    color: "text-amber-400",
    border: "hover:border-amber-500/30",
  },
  {
    id: "enterprise",
    label: "Enterprise blockers",
    description: "Zero in on compliance, SSO, permissions, and admin concerns.",
    prompt: "Focus on blockers specific to enterprise adoption: compliance gaps, SSO/auth issues, permission model complexity, audit trails, and admin controls. Ignore SMB-only feedback.",
    icon: "🏢",
    color: "text-emerald-400",
    border: "hover:border-emerald-500/30",
  },
  {
    id: "pricing",
    label: "Pricing & packaging",
    description: "Identify friction around cost, seat pricing, and renewal surprises.",
    prompt: "Focus on pricing-related feedback: unexpected cost increases, seat/guest pricing confusion, value perception gaps, and churn signals linked to pricing. Cross-reference against customer ARR tiers.",
    icon: "💸",
    color: "text-rose-400",
    border: "hover:border-rose-500/30",
  },
  {
    id: "ai_ops",
    label: "AI & automation gaps",
    description: "Find where AI or agentic solutions would have the highest leverage.",
    prompt: "Focus on repetitive manual workflows, missing automation, and areas where AI assistance would save the most time. Look for patterns where users describe doing the same thing repeatedly or wishing something 'just happened automatically'.",
    icon: "🤖",
    color: "text-indigo-400",
    border: "hover:border-indigo-500/30",
  },
];

function formatRelTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatARR(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

type Props = {
  selectedFocus: string;
  customFocus: string;
  onSelectFocus: (prompt: string) => void;
  onCustomFocus: (val: string) => void;
  onRun: () => void;
  disabled: boolean;
};

export default function FocusPane({ selectedFocus, customFocus, onSelectFocus, onCustomFocus, onRun, disabled }: Props) {
  const [history, setHistory] = useState<HistoryRun[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e] overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <p className="text-xs font-semibold text-white mb-0.5">What do you want to focus on?</p>
        <p className="text-[11px] text-gray-600">Choose a lens or describe your own.</p>
      </div>

      {/* Focus options */}
      <div className="px-3 space-y-1.5 shrink-0">
        {FOCUS_OPTIONS.map((opt) => {
          const active = selectedFocus === opt.prompt;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectFocus(active ? "general" : opt.prompt)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                active
                  ? "bg-white/[0.06] border-white/[0.12]"
                  : `bg-transparent border-white/[0.04] ${opt.border}`
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm leading-none">{opt.icon}</span>
                <span className={`text-xs font-semibold ${active ? "text-white" : "text-gray-300"}`}>
                  {opt.label}
                </span>
                {active && (
                  <span className={`ml-auto text-[10px] font-medium ${opt.color}`}>selected</span>
                )}
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed pl-5">{opt.description}</p>
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      <div className="px-3 mt-3 shrink-0">
        <textarea
          rows={2}
          placeholder="Or describe a custom focus area..."
          value={customFocus}
          onChange={(e) => onCustomFocus(e.target.value)}
          onFocus={() => { if (selectedFocus !== "custom") onSelectFocus("custom"); }}
          className={`w-full bg-white/[0.03] border rounded-lg px-3 py-2.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none resize-none transition-colors leading-relaxed ${
            selectedFocus === "custom"
              ? "border-white/[0.15]"
              : "border-white/[0.06] focus:border-white/[0.12]"
          }`}
        />
      </div>

      {/* Run button */}
      <div className="px-3 mt-3 shrink-0">
        <button
          onClick={onRun}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap size={12} />
          Run Agent
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-5 shrink-0">
          <div className="flex items-center justify-between px-5 mb-2">
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-gray-600" />
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Recent runs</span>
            </div>
            <button
              onClick={handleClearHistory}
              className="text-[10px] text-gray-700 hover:text-gray-500 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={10} />
              Clear
            </button>
          </div>
          <div className="px-3 space-y-1">
            {history.slice(0, 6).map((run) => (
              <div
                key={run.id}
                className="px-3 py-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-default"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-400 font-medium truncate max-w-[140px]">
                    {run.focus === "general" ? "General synthesis" : FOCUS_OPTIONS.find(f => f.prompt === run.focus)?.label ?? "Custom"}
                  </span>
                  <span className="text-[10px] text-gray-600 shrink-0 ml-2">{formatRelTime(run.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-600">
                  <span>{run.theme_count} themes</span>
                  <span className="text-gray-700">·</span>
                  <span className="text-rose-500/70">{formatARR(run.arr_at_risk)} at risk</span>
                  <span className="text-gray-700">·</span>
                  <span className="truncate">{run.sources.join(", ")}</span>
                </div>
                {run.top_theme && (
                  <p className="text-[10px] text-gray-600 mt-0.5 truncate">Top: {run.top_theme}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-4 shrink-0" />
    </div>
  );
}
