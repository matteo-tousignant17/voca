"use client";

import Sidebar from "@/components/Sidebar";
import { useHistory } from "@/context/HistoryContext";
import { formatARR, formatRelativeTime, SOURCE_LABELS, type HistoryEntry } from "@/lib/history";
import { FileText } from "lucide-react";

export default function ReportsPage() {
  const { reports } = useHistory();

  return (
    <div className="flex h-screen overflow-hidden bg-[#090909]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 shrink-0 flex items-center px-5 border-b border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-sm">
          <div>
            <h1 className="text-sm font-semibold text-white">Reports</h1>
            <p className="text-[11px] text-gray-500 leading-none mt-0.5">Saved analyses for deeper review</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {reports.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-3 max-w-2xl">
              {reports.map((entry) => (
                <ReportCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
        <FileText size={18} className="text-gray-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400">No reports yet</p>
        <p className="text-xs text-gray-600 mt-1">Run an analysis and save it to see it here</p>
      </div>
    </div>
  );
}

function ReportCard({ entry }: { entry: HistoryEntry }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors cursor-default">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-300">
            {new Date(entry.timestamp).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            <span className="text-gray-600 font-normal ml-1.5">
              {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2.5">
            <Stat label="Themes" value={String(entry.summary.total_themes)} />
            <Stat label="ARR at risk" value={formatARR(entry.summary.total_arr_at_risk)} accent />
            <Stat label="Customers" value={String(entry.summary.total_customers)} />
          </div>
        </div>

        <div className="text-[10px] text-gray-600">{formatRelativeTime(entry.timestamp)}</div>
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        {entry.sources.map((src) => (
          <span
            key={src}
            className="text-[10px] bg-white/[0.05] text-gray-500 px-2 py-0.5 rounded-full border border-white/[0.06]"
          >
            {SOURCE_LABELS[src] ?? src}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-sm font-semibold ${accent ? "text-violet-400" : "text-white"}`}>{value}</div>
      <div className="text-[10px] text-gray-600 mt-0.5">{label}</div>
    </div>
  );
}
