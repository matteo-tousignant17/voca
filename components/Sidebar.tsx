"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Database, FileText, Settings, Zap } from "lucide-react";

const NAV_ITEMS = [
  { id: "analyze",  label: "Analyze",  icon: BarChart2, href: "/" },
  { id: "sources",  label: "Sources",  icon: Database,  href: "/sources" },
  { id: "reports",  label: "Reports",  icon: FileText,   href: "/reports", soon: true },
  { id: "settings", label: "Settings", icon: Settings,   href: "/settings", soon: true },
];

export default function Sidebar() {
  const pathname = usePathname();

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
        <div className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            N
          </div>
          <div className="min-w-0 text-left">
            <div className="text-xs font-medium text-gray-200 truncate">Notion</div>
            <div className="text-[10px] text-gray-500 truncate">$8M ARR · 750 customers</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.soon ? "#" : item.href}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}
            >
              <Icon size={15} className={active ? "text-violet-400" : "text-gray-600"} />
              <span className="font-medium flex-1">{item.label}</span>
              {item.soon && (
                <span className="text-[10px] bg-gray-800 text-gray-600 px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
            M
          </div>
          <div className="min-w-0 text-left flex-1">
            <div className="text-xs font-medium text-gray-300 truncate">Matteo T.</div>
            <div className="text-[10px] text-gray-600 truncate">Product Manager</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
