import type { AgentEvent, BriefItem, ToolResultDetail } from "./agent";
import { getCRMSegments } from "./tools/get_crm";
import { DEMO_SOURCES, type DemoSource } from "./demo_sources";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ScriptedTheme = {
  name: string;
  problem_statement: string;
  severity: BriefItem["severity"];
  affected_segments: string[];
  evidence: BriefItem["evidence"];
  customers_affected: number;
  arr_at_risk: number;
  arr_at_risk_pct: number;
  tradeoffs: BriefItem["tradeoffs"];
  named_at_risk_accounts: BriefItem["named_at_risk_accounts"];
  churn_signal: string;
  suggested_action: string;
};

/** Demo brief: two canonical enterprise themes for product walkthroughs / ideation demos only. */
const SCRIPTED_THEMES: ScriptedTheme[] = [
  {
    name: "Real-time collaboration data loss",
    problem_statement:
      "Simultaneous editing conflicts intermittently delete content, breaking trust in Notion as a single source of truth and triggering executive-level renewal escalations.",
    severity: "critical",
    affected_segments: ["mid_market", "enterprise"],
    evidence: [
      {
        quote:
          "Our lead designer spent two days on a client presentation in Notion, and a simultaneous editing conflict wiped out about 30% of it. We had no backup.",
        source: "Gong Call, Mid-Market",
        company_size: "Mid-Market",
      },
      {
        quote:
          "Our legal team's contract review database lost ~40% of comments after a sync conflict. Support could not recover them.",
        source: "G2 Review, Enterprise",
        company_size: "Enterprise",
      },
    ],
    customers_affected: 192,
    arr_at_risk: 3_140_000,
    arr_at_risk_pct: 22,
    tradeoffs: {
      effort: "High effort",
      impact: "Very high retention impact",
      segment_skew: "Mid-Market + Enterprise-skewed",
    },
    named_at_risk_accounts: [
      {
        name: "Lattice Robotics",
        arr: 320_000,
        risk_reason:
          "Largest account; foundational issues (data loss, search, AI context) raised at executive level",
      },
      {
        name: "Velocity Agency",
        arr: 18_000,
        risk_reason:
          "Real-time data loss incident + 20% pricing increase, leadership-level churn risk",
      },
    ],
    churn_signal:
      "Enterprise NPS -5 6mo · Mid-Market NPS -3 6mo · $698K churned (90d)",
    suggested_action:
      "Address real-time collaboration data loss — 22% ARR at risk ($3.1M). Concrete renewal exposure: Lattice Robotics, Velocity Agency. Immediate investigation sprint recommended; pair with a temporary client-side autosave/restore safety net.",
  },
  {
    name: "Enterprise audit log + governance gaps",
    problem_statement:
      "Audit log incompleteness, weak admin role separation, and unreliable SSO are blocking SOC2 / HIPAA / EU residency requirements and stalling enterprise renewals and 100+ seat expansions.",
    severity: "critical",
    affected_segments: ["enterprise"],
    evidence: [
      {
        quote:
          "Our compliance team did a review and Notion can't tell us clearly who edited what and when. That's a blocker for our regulatory requirements.",
        source: "Gong Call, Enterprise",
        company_size: "Enterprise",
      },
      {
        quote:
          "We're now running Notion in parallel with a more controlled system just for sensitive documents.",
        source: "G2 Review, Mid-Market",
        company_size: "Mid-Market",
      },
    ],
    customers_affected: 48,
    arr_at_risk: 2_640_000,
    arr_at_risk_pct: 18,
    tradeoffs: {
      effort: "High effort",
      impact: "Very high retention impact",
      segment_skew: "Enterprise-skewed",
    },
    named_at_risk_accounts: [
      {
        name: "Helix Biosciences",
        arr: 168_000,
        risk_reason: "SOC2 audit log gap + EU data residency, 60-day renewal window",
      },
      {
        name: "Heritage Wealth",
        arr: 112_000,
        risk_reason:
          "300-seat expansion blocked by audit log immutability and data residency",
      },
      {
        name: "Meridian Capital Group",
        arr: 96_000,
        risk_reason:
          "SSO reliability and audit log; multi-year deal contingent on fixes",
      },
    ],
    churn_signal: "Enterprise NPS -5 6mo · $412K churned (90d)",
    suggested_action:
      "Address enterprise audit log + governance gaps — 18% ARR at risk ($2.6M). Concrete renewal exposure: Helix Biosciences, Heritage Wealth. Ship immutable audit log + admin role separation in a focused enterprise-readiness sprint.",
  },
];

function rankedBrief(): BriefItem[] {
  return [...SCRIPTED_THEMES]
    .sort((a, b) => b.arr_at_risk - a.arr_at_risk)
    .map((t, idx) => ({
      rank: idx + 1,
      theme_name: t.name,
      problem_statement: t.problem_statement,
      evidence: t.evidence,
      customers_affected: t.customers_affected,
      arr_at_risk: t.arr_at_risk,
      arr_at_risk_pct: t.arr_at_risk_pct,
      severity: t.severity,
      tradeoffs: t.tradeoffs,
      suggested_action: t.suggested_action,
      named_at_risk_accounts: t.named_at_risk_accounts,
      churn_signal: t.churn_signal,
    }));
}

export async function* runDemoAgent(
  sources: string[],
  focus?: string
): AsyncGenerator<AgentEvent> {
  const crm = getCRMSegments();

  // Resolve which demo sources are active based on the requested IDs
  const activeSources: DemoSource[] = sources
    .map((id) => DEMO_SOURCES.find((d) => d.id === id))
    .filter((d): d is DemoSource => !!d);

  const sourcesToFetch = activeSources.length > 0 ? activeSources : DEMO_SOURCES;
  const itemsCount = sourcesToFetch.reduce((s, d) => s + d.count, 0);

  // Phase 0: intro
  yield { type: "trace", message: "Initializing VoC synthesis agent..." };
  yield {
    type: "trace",
    message: `Sources queued: ${sourcesToFetch.map((s) => s.short_label).join(", ")}`,
  };
  if (focus && focus !== "general" && focus !== "custom") {
    yield {
      type: "trace",
      message: `Focus: ${focus.slice(0, 100)}${focus.length > 100 ? "..." : ""}`,
    };
  }
  yield { type: "trace", message: "Running in demo mode (deterministic playback)" };
  await sleep(500);

  // Phase 1: per-source fetches in a single agent turn
  yield { type: "trace", message: "Agent turn 1..." };
  yield {
    type: "trace",
    message: `Agent: I'll fan out ${sourcesToFetch.length} source-specific fetches in parallel — Salesforce notes, Zendesk tickets, Gong calls, G2 reviews, Reddit, Amplitude funnels, and Pendo NPS — since they're independent.`,
  };
  await sleep(700);

  // Emit all tool_call events first (looks like parallel fan-out)
  for (const src of sourcesToFetch) {
    yield {
      type: "tool_call",
      tool: src.tool_name,
      input: { source: src.id },
    };
    await sleep(140);
  }

  // Then stream tool_result events as they "complete"
  for (const src of sourcesToFetch) {
    await sleep(420);
    yield {
      type: "tool_result",
      tool: src.tool_name,
      summary: src.fetch_summary,
      details: src.fetch_details,
    };
  }
  await sleep(400);

  // Phase 2: get_crm_segments
  yield { type: "trace", message: "Agent turn 2..." };
  yield {
    type: "trace",
    message:
      "Agent: Loading Salesforce CRM segmentation to weight feedback by customer value and named churn risk.",
  };
  await sleep(500);

  yield {
    type: "tool_call",
    tool: "get_crm_segments",
    input: {},
  };
  await sleep(700);

  const crmDetail: ToolResultDetail = {
    kind: "table",
    columns: ["Segment", "Customers", "Total ARR", "NPS (6mo)", "Churned 90d"],
    rows: Object.values(crm.segments).map((s) => [
      s.label,
      s.customers,
      `$${(s.total_arr / 1_000_000).toFixed(1)}M`,
      `${s.nps_current ?? "—"} (${(s.nps_trend_6mo ?? 0) > 0 ? "+" : ""}${s.nps_trend_6mo ?? 0})`,
      `$${Math.round((s.recent_churned_arr_90d ?? 0) / 1000)}K`,
    ]),
  };

  yield {
    type: "tool_result",
    tool: "get_crm_segments",
    summary: `Loaded CRM: ${crm.total_customers} customers, $${(crm.total_arr / 1_000_000).toFixed(1)}M ARR · 14 named at-risk accounts ($1.45M exposure)`,
    details: crmDetail,
  };
  await sleep(500);

  // Phase 3: synthesize_themes
  yield { type: "trace", message: "Agent turn 3..." };
  yield {
    type: "trace",
    message:
      "Agent: Clustering across all 7 sources — looking for cross-channel patterns and severity signals.",
  };
  await sleep(450);

  yield {
    type: "tool_call",
    tool: "synthesize_themes",
    input: { focus: focus ?? "general" },
  };
  yield {
    type: "trace",
    message: `Clustering ${itemsCount} items into themes...`,
  };
  await sleep(1500);

  const synthesisDetail: ToolResultDetail = {
    kind: "table",
    columns: ["Theme", "Severity", "Frequency", "Top sources"],
    rows: SCRIPTED_THEMES.map((t) => [
      t.name,
      t.severity,
      Math.round(t.customers_affected / 22),
      themeSourceLabel(t.name, sourcesToFetch),
    ]),
  };

  yield {
    type: "tool_result",
    tool: "synthesize_themes",
    summary: `Synthesized ${SCRIPTED_THEMES.length} themes (2 critical)`,
    details: synthesisDetail,
  };
  await sleep(600);

  // Phase 4: calculate_reach_impact
  yield { type: "trace", message: "Agent turn 4..." };
  yield {
    type: "trace",
    message:
      "Agent: Cross-referencing themes against CRM segments and mapping named at-risk accounts.",
  };
  await sleep(450);

  yield {
    type: "tool_call",
    tool: "calculate_reach_impact",
    input: {},
  };
  await sleep(1000);

  const totalARRRisk = SCRIPTED_THEMES.reduce(
    (s, t) => s + t.arr_at_risk,
    0
  );
  const namedCount = SCRIPTED_THEMES.reduce(
    (s, t) => s + t.named_at_risk_accounts.length,
    0
  );

  const impactDetail: ToolResultDetail = {
    kind: "table",
    columns: ["Theme", "Customers", "ARR at risk", "% total ARR", "Named accounts"],
    rows: SCRIPTED_THEMES.map((t) => [
      t.name,
      t.customers_affected,
      `$${(t.arr_at_risk / 1000).toFixed(0)}K`,
      `${t.arr_at_risk_pct}%`,
      t.named_at_risk_accounts.map((a) => a.name).join(", "),
    ]),
  };

  yield {
    type: "tool_result",
    tool: "calculate_reach_impact",
    summary: `Calculated impact: $${(totalARRRisk / 1_000_000).toFixed(1)}M ARR at risk · ${namedCount} named at-risk accounts mapped`,
    details: impactDetail,
  };
  await sleep(500);

  // Phase 5: generate_prioritized_brief
  yield { type: "trace", message: "Agent turn 5..." };
  yield {
    type: "trace",
    message:
      "Agent: Composing the prioritized brief, ranking by ARR at risk and attaching tradeoffs + suggested actions.",
  };
  await sleep(450);

  yield {
    type: "tool_call",
    tool: "generate_prioritized_brief",
    input: {},
  };
  await sleep(900);

  const brief = rankedBrief();

  const briefDetail: ToolResultDetail = {
    kind: "list",
    items: brief.map(
      (b) =>
        `#${b.rank} ${b.theme_name} — $${(b.arr_at_risk / 1000).toFixed(0)}K (${b.arr_at_risk_pct}%) · ${b.severity}`
    ),
  };

  yield {
    type: "tool_result",
    tool: "generate_prioritized_brief",
    summary: `Generated prioritized brief with ${brief.length} ranked items`,
    details: briefDetail,
  };
  await sleep(350);

  for (const item of brief) {
    yield { type: "theme", data: item };
    await sleep(200);
  }

  const totalARR = brief.reduce((s, i) => s + i.arr_at_risk, 0);
  const totalCustomers = brief.reduce((s, i) => s + i.customers_affected, 0);
  yield {
    type: "complete",
    total_themes: brief.length,
    total_arr_at_risk: totalARR,
    total_customers: totalCustomers,
  };
}

function themeSourceLabel(themeName: string, available: DemoSource[]): string {
  const ids = THEME_SOURCE_MAP[themeName] ?? [];
  const labels = ids
    .map((id) => available.find((s) => s.id === id)?.short_label)
    .filter((x): x is string => !!x);
  return labels.join(" · ") || "—";
}

const THEME_SOURCE_MAP: Record<string, string[]> = {
  "Real-time collaboration data loss": ["gong", "g2", "zendesk", "salesforce"],
  "Enterprise audit log + governance gaps": ["salesforce", "gong", "g2", "zendesk"],
};
