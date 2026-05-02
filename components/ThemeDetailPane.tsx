"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Lightbulb, X } from "lucide-react";
import type { BriefItem } from "@/lib/agent";

type Mode = "trace" | "detail";

type Props = {
  theme: BriefItem;
  allThemes: BriefItem[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onSelectTheme: (theme: BriefItem) => void;
  onClose: () => void;
  hasTrace: boolean;
  /** Open focused ideation for this detailed theme */
  onIdeate?: (theme: BriefItem) => void;
  ideateDisabled?: boolean;
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
};

const EVIDENCE_INITIAL = 4;
const EVIDENCE_STEP = 4;
const ACCOUNT_INITIAL = 6;
const ACCOUNT_STEP = 8;
const RELATED_INITIAL = 5;
const RELATED_STEP = 6;
const SOURCE_GROUPS_INITIAL = 3;
const SOURCE_GROUPS_STEP = 3;
const QUOTES_PER_SOURCE_INITIAL = 2;
const QUOTES_PER_SOURCE_STEP = 3;

function stripSourceTags(source: string): string {
  return source.replace(/\s*\([^)]*\)/g, "").trim();
}

function formatARR(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function LoadMoreButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-violet-400/90 hover:text-violet-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <ChevronDown size={12} />
      {label}
    </button>
  );
}

export default function ThemeDetailPane({
  theme,
  allThemes,
  mode,
  onModeChange,
  onSelectTheme,
  onClose,
  hasTrace,
  onIdeate,
  ideateDisabled = false,
}: Props) {
  const otherThemes = useMemo(
    () => allThemes.filter((t) => t.theme_name !== theme.theme_name),
    [allThemes, theme.theme_name],
  );

  const [evidenceVisible, setEvidenceVisible] = useState(EVIDENCE_INITIAL);
  const [accountVisible, setAccountVisible] = useState(ACCOUNT_INITIAL);
  const [relatedVisible, setRelatedVisible] = useState(RELATED_INITIAL);
  const [sourceGroupsVisible, setSourceGroupsVisible] = useState(SOURCE_GROUPS_INITIAL);
  const [quotesShownBySource, setQuotesShownBySource] = useState<Record<string, number>>({});

  const getQuoteLimit = useCallback(
    (sourceKey: string, total: number) => {
      const n = quotesShownBySource[sourceKey] ?? QUOTES_PER_SOURCE_INITIAL;
      return Math.min(n, total);
    },
    [quotesShownBySource],
  );

  // Group quotes by source (stable key order for load-more)
  const groupedEvidence = useMemo(() => {
    const acc: Record<string, typeof theme.evidence> = {};
    for (const ev of theme.evidence ?? []) {
      const key = stripSourceTags(ev.source) || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(ev);
    }
    const keys = Object.keys(acc).sort((a, b) => a.localeCompare(b));
    return { map: acc, keys };
  }, [theme]);

  const evidenceList = theme.evidence ?? [];
  const accounts = theme.named_at_risk_accounts ?? [];
  const evidenceSlice = evidenceList.slice(0, evidenceVisible);
  const hasMoreEvidence = evidenceVisible < evidenceList.length;

  const accountSlice = accounts.slice(0, accountVisible);
  const hasMoreAccounts = accountVisible < accounts.length;

  const relatedSlice = otherThemes.slice(0, relatedVisible);
  const hasMoreRelated = relatedVisible < otherThemes.length;

  const sourceKeysSlice = groupedEvidence.keys.slice(0, sourceGroupsVisible);
  const hasMoreSourceGroups = sourceGroupsVisible < groupedEvidence.keys.length;

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e]">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[theme.severity] ?? "bg-gray-500"}`} />
          <span className="text-xs font-medium text-white truncate">{theme.theme_name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.06] rounded-md p-0.5">
            <button
              type="button"
              disabled={!hasTrace}
              onClick={() => hasTrace && onModeChange("trace")}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded transition-colors ${
                mode === "trace"
                  ? "bg-white/[0.12] text-white"
                  : hasTrace
                  ? "text-gray-500 hover:text-gray-300"
                  : "text-gray-700 cursor-not-allowed"
              }`}
            >
              Trace
            </button>
            <button
              type="button"
              onClick={() => onModeChange("detail")}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded transition-colors ${
                mode === "detail" ? "bg-white/[0.12] text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Detail
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close detail"
            className="p-1 rounded hover:bg-white/[0.06] transition-colors"
          >
            <X size={13} className="text-gray-600 hover:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-6">
        {/* Overview — elaborated */}
        <section className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
          <div>
            <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Problem</h4>
            <p className="text-[13px] text-gray-200 leading-relaxed">{theme.problem_statement}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/[0.05]">
            <span className="text-[10px] text-rose-300 bg-rose-500/[0.08] border border-rose-500/20 px-2 py-0.5 rounded-md font-medium">
              {formatARR(theme.arr_at_risk)} at risk
            </span>
            <span className="text-[10px] text-gray-400 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-md">
              {theme.arr_at_risk_pct}% of total ARR
            </span>
            <span className="text-[10px] text-gray-400 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-md">
              {theme.customers_affected.toLocaleString()} customers affected
            </span>
            <span className="text-[10px] text-violet-300/90 bg-violet-500/[0.08] border border-violet-500/15 px-2 py-0.5 rounded-md capitalize">
              {theme.severity}
            </span>
          </div>
        </section>

        {/* Recommended action — elaborated */}
        <section className="rounded-lg border border-emerald-500/[0.12] bg-emerald-500/[0.04] px-4 py-3 space-y-3">
          <h4 className="text-[10px] font-semibold text-emerald-500/80 uppercase tracking-wider mb-2">Recommended action</h4>
          <p className="text-[12px] text-emerald-100/95 leading-relaxed">{theme.suggested_action}</p>
          {onIdeate ? (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/15">
              <p className="text-[10px] text-emerald-200/65 leading-snug flex-1 min-w-[140px]">
                Run ideation using this theme’s evidence, risks, and recommended action as the seed.
              </p>
              <button
                type="button"
                disabled={ideateDisabled}
                onClick={() => onIdeate(theme)}
                className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
              >
                <Lightbulb size={11} />
                Ideate on this theme →
              </button>
            </div>
          ) : null}
        </section>

        {/* Tradeoffs — elaborated row layout */}
        <section>
          <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Tradeoffs & posture</h4>
          <div className="grid gap-2 sm:grid-cols-1">
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Effort</span>
              <p className="text-[12px] text-gray-300 mt-0.5 leading-relaxed">{theme.tradeoffs.effort}</p>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Retention impact</span>
              <p className="text-[12px] text-gray-300 mt-0.5 leading-relaxed">{theme.tradeoffs.impact}</p>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Segment skew</span>
              <p className="text-[12px] text-gray-300 mt-0.5 leading-relaxed">{theme.tradeoffs.segment_skew}</p>
            </div>
          </div>
          {theme.churn_signal ? (
            <div className="mt-3 rounded-md border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2">
              <span className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-wide">Churn signal</span>
              <p className="text-[12px] text-amber-200/85 mt-1 leading-relaxed">{theme.churn_signal}</p>
            </div>
          ) : null}
        </section>

        {/* Full evidence — elaborate cards + load more */}
        <section>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              Raw customer evidence
            </h4>
            {evidenceList.length > 0 && (
              <span className="text-[10px] text-gray-700 font-mono">
                Showing {Math.min(evidenceVisible, evidenceList.length)} / {evidenceList.length}
              </span>
            )}
          </div>
          {evidenceList.length > 0 ? (
            <>
              <div className="space-y-3">
                {evidenceSlice.map((ev, idx) => {
                  const stripped = stripSourceTags(ev.source);
                  const rawDiffers = stripped !== ev.source.trim();
                  return (
                    <article
                      key={`${stripped}-${idx}`}
                      className="rounded-lg border border-white/[0.06] bg-[#131316]/80 pl-4 pr-3 py-3 shadow-sm shadow-black/20"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono font-semibold text-violet-400/70 tabular-nums">
                          #{idx + 1}
                        </span>
                        {ev.company_size ? (
                          <span className="text-[10px] text-gray-600 shrink-0">{ev.company_size}</span>
                        ) : null}
                      </div>
                      <blockquote className="border-l-2 border-violet-500/35 pl-3">
                        <p className="text-[13px] italic text-gray-200/95 leading-relaxed whitespace-pre-wrap">
                          &ldquo;{ev.quote}&rdquo;
                        </p>
                      </blockquote>
                      <footer className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-500">
                        <span className="text-gray-400 font-medium">{stripped}</span>
                      </footer>
                      {rawDiffers ? (
                        <p className="mt-1.5 text-[9px] text-gray-700 font-mono leading-snug opacity-90" title={ev.source}>
                          Source line: {ev.source}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
              {hasMoreEvidence ? (
                <LoadMoreButton
                  label={`Load more evidence (${evidenceList.length - evidenceVisible} remaining)`}
                  onClick={() => setEvidenceVisible((n) => n + EVIDENCE_STEP)}
                />
              ) : evidenceVisible > EVIDENCE_INITIAL && evidenceList.length > EVIDENCE_INITIAL ? (
                <p className="mt-2 text-[10px] text-gray-700">All {evidenceList.length} quotes shown.</p>
              ) : null}
            </>
          ) : (
            <p className="text-[11px] text-gray-700 italic">No evidence quotes captured.</p>
          )}
        </section>

        {/* Account-level ARR — table + load more */}
        <section>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              Named at-risk accounts
            </h4>
            {accounts.length > 0 && (
              <span className="text-[10px] text-gray-700 font-mono">
                Showing {Math.min(accountVisible, accounts.length)} / {accounts.length}
              </span>
            )}
          </div>
          {accounts.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-md border border-white/[0.05]">
                <table className="w-full text-[11px]">
                  <thead className="bg-white/[0.02]">
                    <tr>
                      <th className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider py-2 px-3 align-bottom">
                        Account
                      </th>
                      <th className="text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider py-2 px-3 align-bottom whitespace-nowrap">
                        ARR
                      </th>
                      <th className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider py-2 px-3 align-bottom min-w-[180px]">
                        Risk rationale
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountSlice.map((acct) => (
                      <tr key={acct.name} className="border-t border-white/[0.04] align-top">
                        <td className="py-2.5 px-3 text-gray-100 font-semibold">{acct.name}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-rose-300 font-mono font-medium">{formatARR(acct.arr)}</span>
                          <div className="text-[9px] text-gray-700 font-normal mt-0.5">
                            (${(acct.arr / 1000).toFixed(0)}K)
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 leading-relaxed max-w-md">{acct.risk_reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMoreAccounts ? (
                <LoadMoreButton
                  label={`Load more accounts (${accounts.length - accountVisible} remaining)`}
                  onClick={() => setAccountVisible((n) => n + ACCOUNT_STEP)}
                />
              ) : accounts.length > ACCOUNT_INITIAL ? (
                <p className="mt-2 text-[10px] text-gray-700">All accounts shown.</p>
              ) : null}
            </>
          ) : (
            <p className="text-[11px] text-gray-700 italic">
              No named at-risk accounts mapped for this theme. Segment posture:{" "}
              <span className="text-gray-500">{theme.tradeoffs.segment_skew}</span>.
            </p>
          )}
        </section>

        {/* Source attribution — per-source elaborate + nested load more */}
        <section>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              Evidence by source channel
            </h4>
            {groupedEvidence.keys.length > 0 && (
              <span className="text-[10px] text-gray-700 font-mono">
                {sourceKeysSlice.length} / {groupedEvidence.keys.length} channels
              </span>
            )}
          </div>
          {groupedEvidence.keys.length > 0 ? (
            <>
              <div className="space-y-3">
                {sourceKeysSlice.map((sourceLabel) => {
                  const items = groupedEvidence.map[sourceLabel];
                  const cap = getQuoteLimit(sourceLabel, items.length);
                  const slice = items.slice(0, cap);
                  const moreInGroup = cap < items.length;
                  return (
                    <div
                      key={sourceLabel}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-white/[0.05]">
                        <span className="text-[12px] font-semibold text-gray-100">{sourceLabel}</span>
                        <span className="text-[10px] text-gray-600 font-mono">
                          {items.length} verbatim quote{items.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <ul className="space-y-3">
                        {slice.map((ev, i) => (
                          <li key={i} className="pl-3 border-l-2 border-sky-500/25">
                            <p className="text-[12px] italic text-gray-300/95 leading-relaxed whitespace-pre-wrap">
                              &ldquo;{ev.quote}&rdquo;
                            </p>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-gray-600">
                              {ev.company_size ? (
                                <span className="text-gray-500">Tier: {ev.company_size}</span>
                              ) : null}
                              {stripSourceTags(ev.source) !== ev.source.trim() ? (
                                <span className="text-gray-700 font-mono truncate max-w-full" title={ev.source}>
                                  {ev.source}
                                </span>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {moreInGroup ? (
                        <LoadMoreButton
                          label={`Load more quotes from ${sourceLabel} (${items.length - cap} remaining)`}
                          onClick={() =>
                            setQuotesShownBySource((prev) => ({
                              ...prev,
                              [sourceLabel]: Math.min(
                                (prev[sourceLabel] ?? QUOTES_PER_SOURCE_INITIAL) + QUOTES_PER_SOURCE_STEP,
                                items.length,
                              ),
                            }))
                          }
                        />
                      ) : items.length > QUOTES_PER_SOURCE_INITIAL ? (
                        <p className="mt-2 text-[10px] text-gray-700">All quotes for this channel shown.</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {hasMoreSourceGroups ? (
                <LoadMoreButton
                  label={`Load more channels (${groupedEvidence.keys.length - sourceKeysSlice.length} remaining)`}
                  onClick={() => setSourceGroupsVisible((n) => n + SOURCE_GROUPS_STEP)}
                />
              ) : groupedEvidence.keys.length > SOURCE_GROUPS_INITIAL ? (
                <p className="mt-2 text-[10px] text-gray-700">All source channels expanded.</p>
              ) : null}
            </>
          ) : (
            <p className="text-[11px] text-gray-700 italic">No source attribution available.</p>
          )}
        </section>

        {/* Related themes — compact list + load more */}
        {otherThemes.length > 0 && (
          <section className="pb-2">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Related themes</h4>
              <span className="text-[10px] text-gray-700 font-mono">
                {relatedSlice.length} / {otherThemes.length}
              </span>
            </div>
            <div className="space-y-1">
              {relatedSlice.map((other) => (
                <button
                  key={other.theme_name}
                  type="button"
                  onClick={() => onSelectTheme(other)}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04] transition-colors text-left"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 mt-1 ${SEVERITY_DOT[other.severity] ?? "bg-gray-500"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-gray-600 font-mono">#{other.rank}</span>
                      <span className="text-[13px] font-semibold text-gray-100">{other.theme_name}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-snug">{other.problem_statement}</p>
                  </div>
                  <span className="text-[11px] text-rose-300/85 font-mono font-medium shrink-0 pt-0.5">
                    {formatARR(other.arr_at_risk)}
                  </span>
                </button>
              ))}
            </div>
            {hasMoreRelated ? (
              <LoadMoreButton
                label={`Load more themes (${otherThemes.length - relatedVisible} remaining)`}
                onClick={() => setRelatedVisible((n) => n + RELATED_STEP)}
              />
            ) : relatedVisible > RELATED_INITIAL ? (
              <p className="mt-2 text-[10px] text-gray-700">All related themes visible.</p>
            ) : null}
          </section>
        )}
      </div>
    </div>
  );
}
