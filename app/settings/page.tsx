"use client";

import { Sparkles, Zap } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { saveMode, useAgentMode, type AgentMode } from "@/lib/settings";

export default function SettingsPage() {
  const mode = useAgentMode();

  const handleSelect = (next: AgentMode) => {
    saveMode(next);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#090909]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto min-h-0 px-8 py-8 max-w-3xl w-full">
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Agent mode</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Switch between the real Claude-driven engine and a deterministic demo playback.
                </p>
              </div>
              <span className="text-[10px] font-mono text-gray-600 px-2 py-1 rounded-md border border-white/[0.06] bg-white/[0.02]">
                current: {mode}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Live */}
              <button
                onClick={() => handleSelect("live")}
                className={`text-left p-4 rounded-lg border transition-all ${
                  mode === "live"
                    ? "border-violet-500/40 bg-violet-500/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    mode === "live" ? "bg-violet-500/20" : "bg-white/[0.04]"
                  }`}>
                    <Zap size={14} className={mode === "live" ? "text-violet-300" : "text-gray-500"} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Live engine</div>
                    <div className="text-[10px] text-gray-500">Real Claude tool-use loop</div>
                  </div>
                  {mode === "live" && (
                    <span className="ml-auto text-[10px] font-medium text-violet-300">selected</span>
                  )}
                </div>
                <ul className="space-y-1 text-[11px] text-gray-500 leading-relaxed pl-9">
                  <li>· Pulls real feedback + CRM, runs Claude for clustering</li>
                  <li>· Output reflects your actual data; latency varies (10-40s)</li>
                  <li>· Use this when iterating on tools, prompts, or data</li>
                </ul>
              </button>

              {/* Demo */}
              <button
                onClick={() => handleSelect("demo")}
                className={`text-left p-4 rounded-lg border transition-all ${
                  mode === "demo"
                    ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    mode === "demo" ? "bg-emerald-500/20" : "bg-white/[0.04]"
                  }`}>
                    <Sparkles size={14} className={mode === "demo" ? "text-emerald-300" : "text-gray-500"} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Demo mode</div>
                    <div className="text-[10px] text-gray-500">Scripted ~15s playback</div>
                  </div>
                  {mode === "demo" && (
                    <span className="ml-auto text-[10px] font-medium text-emerald-300">selected</span>
                  )}
                </div>
                <ul className="space-y-1 text-[11px] text-gray-500 leading-relaxed pl-9">
                  <li>· Deterministic trace with expandable tool-result drill-downs</li>
                  <li>· Consistent prioritized brief with named at-risk accounts</li>
                  <li>· Safe for live demos — never fails, always ~15s</li>
                </ul>
              </button>
            </div>

            <div className="mt-4 px-4 py-3 rounded-lg border border-white/[0.05] bg-white/[0.02]">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                <span className="text-gray-300 font-medium">Heads up:</span> the mode is stored in your browser
                (localStorage). It applies to the next run of the Analyze pipeline. Ideation always runs against
                the live engine using whatever brief was last produced.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
