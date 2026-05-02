"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Database, FileText, Settings, Zap, Bookmark, Lightbulb } from "lucide-react";
import { Fragment } from "react";
import { useHistory } from "@/context/HistoryContext";
import { formatRelativeTime, formatARR } from "@/lib/history";

const NAV_ITEMS = [
  {
    id: "analyze", label: "Analyze", icon: BarChart2, href: "/",
    children: [
      { id: "ideate", label: "Ideate", icon: Lightbulb, href: "/#ideate" },
    ],
  },
  { id: "sources",  label: "Sources",  icon: Database,  href: "/sources" },
  { id: "reports",  label: "Reports",  icon: FileText,   href: "/reports" },
  { id: "settings", label: "Settings", icon: Settings,   href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { history, saveReport, isReport } = useHistory();

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
            <div className="text-[10px] text-gray-500 truncate">$14.4M ARR · 1,200 customers</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Fragment key={item.id}>
              <Link
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

              {/* Sub-items — shown when parent is active */}
              {active && item.children?.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <Link
                    key={child.id}
                    href={child.href}
                    className="flex items-center gap-2 pl-7 pr-2.5 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors mt-0.5"
                  >
                    <ChildIcon size={12} className="text-gray-600 shrink-0" />
                    <span>{child.label}</span>
                  </Link>
                );
              })}

              {item.id === "analyze" && history.length > 0 && (
                <div className="mt-0.5 mb-1.5 space-y-0.5">
                  {history.slice(0, 6).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-1.5 pl-8 pr-1.5 py-1.5 rounded-md group hover:bg-white/[0.03] cursor-default"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-gray-600 group-hover:text-gray-400 truncate leading-none">
                          {formatRelativeTime(entry.timestamp)}
                        </div>
                        <div className="text-[10px] text-gray-700 truncate leading-none mt-0.5">
                          {entry.summary.total_themes} themes · {formatARR(entry.summary.total_arr_at_risk)}
                        </div>
                      </div>
                      <button
                        onClick={() => saveReport(entry)}
                        title={isReport(entry.id) ? "Saved to Reports" : "Save to Reports"}
                        className="shrink-0 p-1 rounded hover:bg-white/[0.08] transition-colors"
                      >
                        <Bookmark
                          size={10}
                          className={isReport(entry.id) ? "text-violet-400 fill-violet-400" : "text-gray-700 group-hover:text-gray-500"}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Fragment>
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
