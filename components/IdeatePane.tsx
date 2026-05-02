"use client";

import { Lightbulb, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import type { BriefItem } from "@/lib/agent";

type Props = {
  seedTheme: BriefItem | null;
  prompt: string;
  onPromptChange: (v: string) => void;
  onRun: () => void;
  onCancel: () => void;
  disabled: boolean;
};

export default function IdeatePane({ seedTheme, prompt, onPromptChange, onRun, onCancel, disabled }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(prompt.length, prompt.length);
    // Only focus on mount / when a new seed arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedTheme?.theme_name]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!disabled) onRun();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb size={13} className="text-indigo-400" />
          <span className="text-xs font-medium text-gray-300">Ideate on a theme</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          title="Cancel"
          className="p-1 rounded hover:bg-white/[0.06] transition-colors"
        >
          <X size={13} className="text-gray-600 hover:text-gray-300" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-4">
        {/* Seed context */}
        {seedTheme ? (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Seeded from theme
            </div>
            <div className="text-sm font-semibold text-white mb-1">{seedTheme.theme_name}</div>
            <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">
              {seedTheme.problem_statement}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-rose-300 bg-rose-500/[0.08] border border-rose-500/20 px-2 py-0.5 rounded-md">
                ${(seedTheme.arr_at_risk / 1000).toFixed(0)}K ARR at risk
              </span>
              <span className="text-[10px] text-gray-500 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-md">
                {seedTheme.customers_affected.toLocaleString()} customers
              </span>
              <span className="text-[10px] text-gray-500 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-md">
                {seedTheme.severity}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/[0.06] bg-white/[0.01] px-3 py-2.5">
            <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              No seed selected
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Describe the focus for ideation below.
            </p>
          </div>
        )}

        {/* Editable prompt */}
        <div>
          <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Ideation prompt
          </div>
          <textarea
            ref={textareaRef}
            rows={6}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what the ideation agent should focus on…"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-white/[0.18] resize-none transition-colors leading-relaxed font-mono"
          />
          <p className="text-[10px] text-gray-700 mt-1.5">
            ⌘/Ctrl + Enter to run
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onRun}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Lightbulb size={11} />
          Run Ideation →
        </button>
      </div>
    </div>
  );
}
