"use client";

import {
  BarChart2,
  Database,
  FileText,
  Settings,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "analyze", label: "Analyze", icon: BarChart2, active: true },
  { id: "sources", label: "Sources", icon: Database, active: false },
  { id: "reports", label: "Reports", icon: FileText, active: false },
  { id: "settings", label: "Settings", icon: Settings, active: false },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 flex flex-col bg-[#0c0c0e] border-r border-white/[0.06] h-screen">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <div className="leading-none">
            <div className="text-sm font-semibold text-white tracking-tight">VoC Agent</div>
            <div className="text-[10px] text-gray-500 mt-0.5">by Claude</div>
          </div>
        </div>
      </div>

      {/* Workspace pill */}
      <div className="px-3 py-3 border-b border-white/[0.06]">
        <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-white/[0.04] transition-colors group">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            N
          </div>
          <div className="min-w-0 text-left">
            <div className="text-xs font-medium text-gray-200 truncate">Notion</div>
            <div className="text-[10px] text-gray-500 truncate">$8M ARR · 750 customers</div>
          </div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                item.active
                  ? "bg-white/[0.08] text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}
            >
              <Icon size={15} className={item.active ? "text-violet-400" : "text-gray-600"} />
              <span className="font-medium">{item.label}</span>
              {item.id === "reports" && (
                <span className="ml-auto text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-white/[0.04] transition-colors">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
            M
          </div>
          <div className="min-w-0 text-left flex-1">
            <div className="text-xs font-medium text-gray-300 truncate">Matteo T.</div>
            <div className="text-[10px] text-gray-600 truncate">Product Manager</div>
          </div>
          <Settings size={12} className="text-gray-600 shrink-0" />
        </button>
      </div>
    </aside>
  );
}
