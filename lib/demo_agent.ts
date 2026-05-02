import type { AgentEvent, BriefItem, ToolResultDetail } from "./agent";
import { getCRMSegments } from "./tools/get_crm";

// Total budget ~15 seconds. Keep a sleep helper.
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
        source: "Gong Call (churn_save)",
        company_size: "Mid-Market",
      },
      {
        quote:
          "Our legal team's contract review database lost ~40% of comments after a sync conflict. Support could not recover them.",
        source: "G2 Review",
        company_size: "Enterprise",
      },
      {
        quote:
          "Foundational issues — data loss, search, AI context — raised at executive level on our $320K renewal.",
        source: "Gong Call (renewal_risk)",
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
        source: "Gong Call (renewal_risk)",
        company_size: "Enterprise",
      },
      {
        quote:
          "We're now running Notion in parallel with a more controlled system just for sensitive documents.",
        source: "G2 Review",
        company_size: "Mid-Market",
      },
      {
        quote:
          "Could not pass our HIPAA risk assessment with Notion in the stack. The audit log doesn't capture all events, no field-level encryption, no DLP.",
        source: "G2 Review",
        company_size: "Enterprise",
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
  {
    name: "Offline mode + mobile performance",
    problem_statement:
      "Lack of true offline support and a slow mobile client are blocking field-team rollouts and pushing SMB consultants to Obsidian for note-taking on the go.",
    severity: "high",
    affected_segments: ["smb", "mid_market"],
    evidence: [
      {
        quote:
          "We travel constantly for client work. No offline support means we can't use Notion on planes or in areas with bad reception.",
        source: "Reddit (r/Notion)",
        company_size: "SMB",
      },
      {
        quote:
          "If you had offline mode, I could get you 80 more seats today. That's an easy decision.",
        source: "Gong Call (expansion_blocked)",
        company_size: "Mid-Market",
      },
      {
        quote:
          "Mobile performance blocking client-on-site use — losing the account to Obsidian over offline mode and guest pricing.",
        source: "Support Ticket",
        company_size: "SMB",
      },
    ],
    customers_affected: 448,
    arr_at_risk: 1_920_000,
    arr_at_risk_pct: 13,
    tradeoffs: {
      effort: "Med-High effort",
      impact: "High retention impact",
      segment_skew: "SMB + Mid-Market-skewed",
    },
    named_at_risk_accounts: [
      {
        name: "Northwind Logistics",
        arr: 88_000,
        risk_reason:
          "200-seat field expansion blocked by lack of offline mode and API rate limits",
      },
      {
        name: "Atlas Architecture",
        arr: 9_600,
        risk_reason:
          "Lapsed to Obsidian over offline mode and guest pricing; win-back conversation in progress",
      },
      {
        name: "Headland Studio",
        arr: 6_000,
        risk_reason: "Mobile performance blocking client-on-site use",
      },
    ],
    churn_signal:
      "SMB NPS -7 6mo · Mid-Market NPS -3 6mo · $470K churned (90d)",
    suggested_action:
      "Address offline mode + mobile performance — 13% ARR at risk ($1.9M). Concrete renewal exposure: Northwind Logistics, Atlas Architecture. Schedule for next planning cycle; lead with a service-worker offline read cache + mobile profiling sprint.",
  },
  {
    name: "Search quality at scale",
    problem_statement:
      "Search inside table cells, ranking, and date-filtering is so weak that customers with 8K+ pages route around Notion (Glean / external indexers), undermining the knowledge-base value prop.",
    severity: "high",
    affected_segments: ["mid_market", "enterprise"],
    evidence: [
      {
        quote:
          "I have thousands of documents and regularly can't find things I know exist. This is the core job of a knowledge base — it needs to work.",
        source: "G2 Review",
        company_size: "Mid-Market",
      },
      {
        quote:
          "We're now using Glean on top of Notion for actual search, which is absurd given Notion is supposed to be a knowledge tool.",
        source: "G2 Review",
        company_size: "Enterprise",
      },
      {
        quote:
          "Adoption stalled at 60% over search and permissions confusion.",
        source: "Support Ticket",
        company_size: "Mid-Market",
      },
    ],
    customers_affected: 160,
    arr_at_risk: 1_280_000,
    arr_at_risk_pct: 9,
    tradeoffs: {
      effort: "Med-High effort",
      impact: "High retention impact",
      segment_skew: "Mid-Market + Enterprise-skewed",
    },
    named_at_risk_accounts: [
      {
        name: "NovaSoft Technologies",
        arr: 144_000,
        risk_reason:
          "API performance and search blocking internal tooling expansion",
      },
      {
        name: "Pinecrest Schools",
        arr: 27_000,
        risk_reason:
          "Adoption stalled at 60% over search and permissions confusion",
      },
    ],
    churn_signal: "Mid-Market NPS -3 6mo · $698K churned (90d)",
    suggested_action:
      "Address search quality at scale — 9% ARR at risk ($1.3M). Concrete renewal exposure: NovaSoft Technologies, Pinecrest Schools. Ship in-cell search + ranking pass with date filters; expose a managed Glean-like index for Enterprise.",
  },
  {
    name: "AI add-on context awareness",
    problem_statement:
      "Notion AI is perceived as a generic LLM wrapper without workspace context, so customers turn the add-on off — Coda AI and Glean are cited as preferred alternatives.",
    severity: "high",
    affected_segments: ["smb", "mid_market"],
    evidence: [
      {
        quote:
          "The AI has no awareness of my workspace content — it's just a generic LLM wrapper. Competitors like Coda AI actually understand your data.",
        source: "G2 Review",
        company_size: "SMB",
      },
      {
        quote:
          "We pay for AI but our team avoids it because it can't answer 'what did we decide on this last quarter?'",
        source: "G2 Review",
        company_size: "SMB",
      },
      {
        quote:
          "AI add-on cancel intent at renewal; Glean evaluation underway.",
        source: "Support Ticket",
        company_size: "Mid-Market",
      },
    ],
    customers_affected: 224,
    arr_at_risk: 1_080_000,
    arr_at_risk_pct: 8,
    tradeoffs: {
      effort: "Medium effort",
      impact: "High retention impact",
      segment_skew: "SMB + Mid-Market-skewed",
    },
    named_at_risk_accounts: [
      {
        name: "Bramble Health",
        arr: 36_000,
        risk_reason:
          "AI add-on cancel intent at renewal; Glean evaluation underway",
      },
      {
        name: "Cobalt Studios",
        arr: 22_500,
        risk_reason:
          "Mobile UX and AI add-on quality, ~95% likely to churn at renewal",
      },
    ],
    churn_signal:
      "SMB NPS -7 6mo · Mid-Market NPS -3 6mo · $470K churned (90d)",
    suggested_action:
      "Address AI add-on context awareness — 8% ARR at risk ($1.1M). Concrete renewal exposure: Bramble Health, Cobalt Studios. Ship workspace-grounded retrieval into AI answers with citation back to source pages within the next planning cycle.",
  },
  {
    name: "Pricing transparency & guest seat model",
    problem_statement:
      "Unannounced renewal price hikes (up to 40%) and per-guest pricing are surfacing as headline complaints from agencies and mid-market accounts, eroding trust and triggering procurement escalations.",
    severity: "medium",
    affected_segments: ["smb", "mid_market"],
    evidence: [
      {
        quote:
          "Our annual renewal came in 40% higher than the previous year. No advance notice, no email explaining changes.",
        source: "G2 Review",
        company_size: "Mid-Market",
      },
      {
        quote:
          "Guest seat pricing is brutal for an agency. Our guest costs exceed our member costs.",
        source: "G2 Review",
        company_size: "SMB",
      },
      {
        quote:
          "Repeat billing surprises, requested cancel-pending.",
        source: "Support Ticket",
        company_size: "SMB",
      },
    ],
    customers_affected: 280,
    arr_at_risk: 720_000,
    arr_at_risk_pct: 5,
    tradeoffs: {
      effort: "Medium effort",
      impact: "Moderate retention impact",
      segment_skew: "SMB + Mid-Market-skewed",
    },
    named_at_risk_accounts: [
      {
        name: "Meadowlark Creative",
        arr: 7_800,
        risk_reason: "Repeat billing surprises, requested cancel-pending",
      },
    ],
    churn_signal:
      "SMB NPS -7 6mo · Mid-Market NPS -3 6mo · $470K churned (90d)",
    suggested_action:
      "Address pricing transparency & guest seat model — 5% ARR at risk ($720K). Concrete renewal exposure: Meadowlark Creative. Schedule a CS-led renewal-notice policy + agency-friendly guest tier in next planning cycle.",
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

  // Total ~15s budget. Distribute across phases.
  yield { type: "trace", message: "Initializing VoC synthesis agent..." };
  yield { type: "trace", message: `Sources queued: ${sources.join(", ")}` };
  if (focus && focus !== "general" && focus !== "custom") {
    yield {
      type: "trace",
      message: `Focus: ${focus.slice(0, 100)}${focus.length > 100 ? "..." : ""}`,
    };
  }
  yield { type: "trace", message: "Running in demo mode (deterministic playback)" };
  await sleep(600);

  // Phase 1: fetch_feedback_sources
  yield { type: "trace", message: "Agent turn 1..." };
  yield {
    type: "trace",
    message:
      "Agent: I'll start by fetching all feedback sources and CRM data simultaneously since these are independent operations.",
  };
  await sleep(700);

  yield {
    type: "tool_call",
    tool: "fetch_feedback_sources",
    input: { sources },
  };
  await sleep(1100);

  const sourceCounts: Record<string, number> = {
    reddit: 35,
    g2: 25,
    gong: 14,
    support_tickets: 28,
  };
  const totalItems = sources.reduce(
    (sum, s) => sum + (sourceCounts[s] ?? 0),
    0
  );
  const breakdown = sources
    .map((s) => `${s}:${sourceCounts[s] ?? 0}`)
    .join(", ");

  const feedbackDetail: ToolResultDetail = {
    kind: "table",
    columns: ["Source", "Items", "Avg sentiment", "Top tier"],
    rows: [
      ["reddit", sourceCounts.reddit ?? 0, "mixed (-12 NPS-eq)", "SMB / Mid-Market"],
      ["g2", sourceCounts.g2 ?? 0, "negative (-22 NPS-eq)", "Mid-Market / Enterprise"],
      ["gong", sourceCounts.gong ?? 0, "negative (-31 NPS-eq)", "Mid-Market / Enterprise"],
      ["support_tickets", sourceCounts.support_tickets ?? 0, "very negative (-44 NPS-eq)", "All tiers"],
    ].filter((r) => sources.includes(r[0] as string)),
  };

  yield {
    type: "tool_result",
    tool: "fetch_feedback_sources",
    summary: `Fetched ${totalItems} feedback items across ${sources.length} sources (${breakdown})`,
    details: feedbackDetail,
  };
  await sleep(700);

  // Phase 2: get_crm_segments
  yield {
    type: "tool_call",
    tool: "get_crm_segments",
    input: {},
  };
  await sleep(900);

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
  await sleep(800);

  // Phase 3: synthesize_themes
  yield { type: "trace", message: "Agent turn 2..." };
  yield {
    type: "trace",
    message:
      "Agent: Clustering feedback into distinct problem themes — looking for cross-source patterns and severity signals.",
  };
  await sleep(600);

  yield {
    type: "tool_call",
    tool: "synthesize_themes",
    input: { focus: focus ?? "general" },
  };
  yield {
    type: "trace",
    message: `Clustering ${totalItems} items into themes...`,
  };
  await sleep(1700);

  const synthesisDetail: ToolResultDetail = {
    kind: "table",
    columns: ["Theme", "Severity", "Frequency", "Segments"],
    rows: SCRIPTED_THEMES.map((t) => [
      t.name,
      t.severity,
      Math.round(t.customers_affected / 22),
      t.affected_segments.join(", "),
    ]),
  };

  yield {
    type: "tool_result",
    tool: "synthesize_themes",
    summary: `Synthesized ${SCRIPTED_THEMES.length} themes (2 critical, 3 high, 1 medium)`,
    details: synthesisDetail,
  };
  await sleep(900);

  // Phase 4: calculate_reach_impact
  yield { type: "trace", message: "Agent turn 3..." };
  yield {
    type: "trace",
    message:
      "Agent: Cross-referencing themes against CRM segments and mapping named at-risk accounts.",
  };
  await sleep(600);

  yield {
    type: "tool_call",
    tool: "calculate_reach_impact",
    input: {},
  };
  await sleep(1300);

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
  await sleep(800);

  // Phase 5: generate_prioritized_brief
  yield { type: "trace", message: "Agent turn 4..." };
  yield {
    type: "trace",
    message:
      "Agent: Composing the prioritized brief, ranking by ARR at risk and attaching tradeoffs + suggested actions.",
  };
  await sleep(600);

  yield {
    type: "tool_call",
    tool: "generate_prioritized_brief",
    input: {},
  };
  await sleep(1200);

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
  await sleep(500);

  // Stream theme cards (each one ~250ms)
  for (const item of brief) {
    yield { type: "theme", data: item };
    await sleep(250);
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
