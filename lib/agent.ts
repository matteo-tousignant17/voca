import Anthropic from "@anthropic-ai/sdk";
import { fetchFeedbackSources, type FeedbackItem } from "./tools/fetch_feedback";
import { getCRMSegments, type CRMData, type CRMAtRiskAccount } from "./tools/get_crm";

const client = new Anthropic();
const MODEL = "claude-sonnet-4-6";

export type Theme = {
  name: string;
  problem_statement: string;
  affected_segments: string[];
  evidence: Array<{
    quote: string;
    source: string;
    company_size?: string;
  }>;
  frequency: number;
  severity: "critical" | "high" | "medium" | "low";
};

export type ImpactData = {
  theme_name: string;
  customers_affected: number;
  arr_at_risk: number;
  arr_at_risk_pct: number;
  segment_breakdown: Record<string, { customers: number; arr: number }>;
  named_at_risk_accounts: CRMAtRiskAccount[];
  churn_signal: string;
};

export type BriefItem = {
  rank: number;
  theme_name: string;
  problem_statement: string;
  evidence: Array<{ quote: string; source: string; company_size?: string }>;
  customers_affected: number;
  arr_at_risk: number;
  arr_at_risk_pct: number;
  severity: string;
  tradeoffs: {
    effort: string;
    impact: string;
    segment_skew: string;
  };
  suggested_action: string;
  named_at_risk_accounts: CRMAtRiskAccount[];
  churn_signal: string;
};

export type ToolResultDetail =
  | { kind: "kv"; rows: Array<{ label: string; value: string }> }
  | { kind: "list"; items: string[] }
  | { kind: "table"; columns: string[]; rows: Array<Array<string | number>> }
  | { kind: "quotes"; items: Array<{ quote: string; source: string; tier?: string }> };

export type AgentEvent =
  | { type: "trace"; message: string }
  | { type: "tool_call"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; summary: string; details?: ToolResultDetail }
  | { type: "theme"; data: BriefItem }
  | { type: "complete"; total_themes: number; total_arr_at_risk: number; total_customers: number }
  | { type: "error"; message: string };

const TOOLS: Anthropic.Tool[] = [
  {
    name: "fetch_feedback_sources",
    description:
      "Pulls customer feedback from the requested sources and stores it server-side. Returns a compact summary of what was loaded. Call once at the start.",
    input_schema: {
      type: "object" as const,
      properties: {
        sources: {
          type: "array",
          items: { type: "string", enum: ["reddit", "g2", "gong", "support_tickets"] },
          description: "Sources to pull",
        },
      },
      required: ["sources"],
    },
  },
  {
    name: "get_crm_segments",
    description:
      "Loads Salesforce CRM segmentation (SMB / Mid-Market / Enterprise) with ARR, NPS, recent churned ARR, and named at-risk accounts. Stored server-side. Returns a compact summary.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "synthesize_themes",
    description:
      "Runs a clustering pass over the loaded feedback and produces 4-6 distinct problem themes with evidence quotes and severity. The agent does NOT pass themes in — the tool generates them from the server-side feedback. Optional `focus` argument biases the synthesis.",
    input_schema: {
      type: "object" as const,
      properties: {
        focus: {
          type: "string",
          description: "Optional focus instruction to bias clustering (e.g. 'enterprise renewal risk').",
        },
      },
      required: [],
    },
  },
  {
    name: "calculate_reach_impact",
    description:
      "Cross-references the synthesized themes with the loaded CRM data. For each theme, computes affected customer counts, ARR at risk, segment breakdown, named at-risk accounts, and a churn signal (NPS trend / recent churned ARR).",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "generate_prioritized_brief",
    description:
      "Produces the final ranked brief: themes sorted by ARR at risk, with evidence, named at-risk accounts, tradeoffs, and a concrete suggested action per theme.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

type AgentState = {
  feedback?: FeedbackItem[];
  crm?: CRMData;
  themes?: Theme[];
  impact?: ImpactData[];
  focus?: string;
};

const SEGMENT_KEY_MAP: Record<string, string> = {
  smb: "smb",
  small: "smb",
  small_business: "smb",
  mid_market: "mid_market",
  midmarket: "mid_market",
  mid: "mid_market",
  enterprise: "enterprise",
  ent: "enterprise",
};

function normalizeSegmentKey(seg: string): string {
  const norm = seg.toLowerCase().replace(/[-\s]/g, "_").replace(/[()]/g, "");
  if (SEGMENT_KEY_MAP[norm]) return SEGMENT_KEY_MAP[norm];
  for (const key of Object.keys(SEGMENT_KEY_MAP)) {
    if (norm.includes(key)) return SEGMENT_KEY_MAP[key];
  }
  return norm;
}

async function synthesizeThemesFromFeedback(
  feedback: FeedbackItem[],
  focus?: string
): Promise<Theme[]> {
  const focusClause = focus && focus !== "general" && focus !== "custom"
    ? `\n\nFOCUS: bias the clustering toward — ${focus}`
    : "";

  // Compact serialization — keep total tokens manageable
  const corpus = feedback
    .map((f) => {
      const tier = f.account_tier ?? f.company_size ?? "unknown";
      const arrTag = f.arr ? ` $${(f.arr / 1000).toFixed(0)}K ARR` : "";
      return `[${f.id}] (${f.source} · ${tier}${arrTag}) ${f.text}`;
    })
    .join("\n");

  const system = `You are a Voice of Customer synthesizer. Cluster the feedback corpus into 4-6 distinct, non-overlapping problem themes. For each theme, return a name, a 1-2 sentence problem statement, the affected segments (only "smb", "mid_market", "enterprise"), 2-4 evidence quotes pulled VERBATIM from the corpus, a frequency count (how many items support it), and a severity (critical / high / medium / low).

Severity rubric:
- critical: data loss, security/compliance gaps, churn-imminent, blocking enterprise deals
- high: major friction blocking expansion / renewal, recurring across segments
- medium: quality of life, adoption friction
- low: nice-to-have

Output ONLY by calling the return_themes tool. Quotes must be exact substrings from the corpus. Use real wording — do not paraphrase.${focusClause}`;

  const themesTool: Anthropic.Tool = {
    name: "return_themes",
    description: "Return the synthesized themes.",
    input_schema: {
      type: "object" as const,
      properties: {
        themes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              problem_statement: { type: "string" },
              affected_segments: { type: "array", items: { type: "string", enum: ["smb", "mid_market", "enterprise"] } },
              evidence: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    quote: { type: "string" },
                    source: { type: "string" },
                    company_size: { type: "string" },
                  },
                  required: ["quote", "source"],
                },
              },
              frequency: { type: "number" },
              severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
            },
            required: ["name", "problem_statement", "affected_segments", "evidence", "frequency", "severity"],
          },
        },
      },
      required: ["themes"],
    },
  };

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    system,
    tools: [themesTool],
    tool_choice: { type: "tool", name: "return_themes" },
    messages: [
      {
        role: "user",
        content: `Corpus (${feedback.length} items):\n\n${corpus}\n\nReturn 4-6 themes via the return_themes tool.`,
      },
    ],
  });

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "return_themes") {
      const input = block.input as { themes: Theme[] };
      return input.themes ?? [];
    }
  }

  return [];
}

function severityWeight(sev: Theme["severity"]): number {
  return sev === "critical" ? 0.6 : sev === "high" ? 0.4 : sev === "medium" ? 0.25 : 0.1;
}

function computeImpact(themes: Theme[], crm: CRMData): ImpactData[] {
  return themes.map((theme) => {
    const segments = (theme.affected_segments?.length ? theme.affected_segments : ["smb", "mid_market", "enterprise"]).map(normalizeSegmentKey);
    let totalCustomers = 0;
    let totalARR = 0;
    const breakdown: Record<string, { customers: number; arr: number }> = {};
    const namedAtRisk: CRMAtRiskAccount[] = [];

    const sevPct = severityWeight(theme.severity);

    for (const segKey of segments) {
      const segData = crm.segments[segKey];
      if (!segData) continue;

      const cust = Math.round(segData.customers * sevPct);
      const arr = Math.round(cust * segData.avg_arr);
      breakdown[segData.label] = { customers: cust, arr };
      totalCustomers += cust;
      totalARR += arr;

      // Pull named at-risk accounts whose risk_reason resonates with this theme
      const themeKeywords = `${theme.name} ${theme.problem_statement}`.toLowerCase();
      for (const acct of segData.top_at_risk_accounts ?? []) {
        const reason = acct.risk_reason.toLowerCase();
        const tokens = themeKeywords
          .split(/[^a-z0-9]+/)
          .filter((t) => t.length >= 5);
        const overlap = tokens.some((t) => reason.includes(t));
        if (overlap && !namedAtRisk.find((a) => a.name === acct.name)) {
          namedAtRisk.push(acct);
        }
      }
    }

    if (totalCustomers === 0) {
      totalCustomers = Math.round(crm.total_customers * sevPct);
      totalARR = Math.round(crm.total_arr * sevPct * 0.5);
    }

    // Churn signal — combine NPS trend + recent churned ARR for the affected segments
    const npsTrendParts: string[] = [];
    let recentChurnedARR = 0;
    for (const segKey of segments) {
      const segData = crm.segments[segKey];
      if (!segData) continue;
      if (typeof segData.nps_trend_6mo === "number") {
        npsTrendParts.push(`${segData.label} NPS ${segData.nps_trend_6mo > 0 ? "+" : ""}${segData.nps_trend_6mo} 6mo`);
      }
      recentChurnedARR += segData.recent_churned_arr_90d ?? 0;
    }
    const churnSignal = recentChurnedARR > 0
      ? `${npsTrendParts.join(" · ")} · $${Math.round(recentChurnedARR / 1000)}K churned (90d)`
      : npsTrendParts.join(" · ") || "";

    // Cap to top 3 named accounts by ARR
    namedAtRisk.sort((a, b) => b.arr - a.arr);

    return {
      theme_name: theme.name,
      customers_affected: totalCustomers,
      arr_at_risk: totalARR,
      arr_at_risk_pct: Math.round((totalARR / crm.total_arr) * 100),
      segment_breakdown: breakdown,
      named_at_risk_accounts: namedAtRisk.slice(0, 3),
      churn_signal: churnSignal,
    };
  });
}

function buildBrief(themes: Theme[], impact: ImpactData[]): BriefItem[] {
  const impactMap = new Map(impact.map((i) => [i.theme_name, i]));

  const effortMap: Record<string, string> = {
    critical: "High effort",
    high: "Med-High effort",
    medium: "Medium effort",
    low: "Low effort",
  };

  const items = themes.map((theme) => {
    const imp = impactMap.get(theme.name) ?? {
      theme_name: theme.name,
      customers_affected: 0,
      arr_at_risk: 0,
      arr_at_risk_pct: 0,
      segment_breakdown: {},
      named_at_risk_accounts: [],
      churn_signal: "",
    };

    const segKeys = Object.keys(imp.segment_breakdown);
    const segSkew = segKeys.length > 0 ? `${segKeys.join(" + ")}-skewed` : "Broad";

    const namedList = imp.named_at_risk_accounts.length
      ? imp.named_at_risk_accounts.map((a) => a.name).slice(0, 2).join(", ")
      : "";

    const action = namedList
      ? `Address ${theme.name.toLowerCase()} — ${imp.arr_at_risk_pct}% ARR at risk ($${(imp.arr_at_risk / 1000).toFixed(0)}K). Concrete renewal exposure: ${namedList}. ${theme.severity === "critical" ? "Immediate investigation sprint." : "Schedule for next planning cycle."}`
      : `Address ${theme.name.toLowerCase()} — estimated ${imp.arr_at_risk_pct}% ARR at risk ($${(imp.arr_at_risk / 1000).toFixed(0)}K). ${theme.severity === "critical" ? "Immediate investigation sprint." : "Schedule for next planning cycle."}`;

    return {
      rank: 0,
      theme_name: theme.name,
      problem_statement: theme.problem_statement,
      evidence: (theme.evidence ?? []).slice(0, 3),
      customers_affected: imp.customers_affected,
      arr_at_risk: imp.arr_at_risk,
      arr_at_risk_pct: imp.arr_at_risk_pct,
      severity: theme.severity,
      tradeoffs: {
        effort: effortMap[theme.severity] ?? "Medium effort",
        impact: theme.severity === "critical" ? "Very high retention impact" : theme.severity === "high" ? "High retention impact" : "Moderate retention impact",
        segment_skew: segSkew,
      },
      suggested_action: action,
      named_at_risk_accounts: imp.named_at_risk_accounts,
      churn_signal: imp.churn_signal,
    } satisfies BriefItem;
  });

  return items
    .sort((a, b) => b.arr_at_risk - a.arr_at_risk)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}

export async function* runVoCAgent(sources: string[], focus?: string): AsyncGenerator<AgentEvent> {
  yield { type: "trace", message: "Initializing VoC synthesis agent..." };
  yield { type: "trace", message: `Sources queued: ${sources.join(", ")}` };
  if (focus && focus !== "general" && focus !== "custom") {
    yield { type: "trace", message: `Focus: ${focus.slice(0, 100)}${focus.length > 100 ? "..." : ""}` };
  }

  const focusClause = focus && focus !== "general" && focus !== "custom"
    ? `\n\nFOCUS INSTRUCTION (apply during synthesize_themes): ${focus}`
    : "";

  const systemPrompt = `You are the Voice of Customer synthesis orchestrator for product managers at Notion.

Your job is to drive a sequence of tools and stream a prioritized brief. You do NOT generate themes yourself — the synthesize_themes tool does the clustering server-side using the loaded feedback.

Pipeline (call each tool exactly once, in order):
1. fetch_feedback_sources(sources)
2. get_crm_segments()
3. synthesize_themes(focus?)        ← server-side clustering, returns themes
4. calculate_reach_impact()         ← uses loaded CRM (NPS, churned ARR, named at-risk accounts)
5. generate_prioritized_brief()     ← composes ranked output

Between tool calls, write a single short sentence (≤ 20 words) explaining what you are doing next. After generate_prioritized_brief returns, end your turn.${focusClause}`;

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Run the full VoC pipeline for Notion across these sources: ${sources.join(", ")}.\nCall each tool in order and end your turn after generate_prioritized_brief.`,
    },
  ];

  const state: AgentState = { focus };
  let finalBrief: BriefItem[] | null = null;

  for (let iteration = 0; iteration < 8; iteration++) {
    yield { type: "trace", message: `Agent turn ${iteration + 1}...` };

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });
    } catch (err) {
      yield { type: "error", message: `Agent call failed: ${err instanceof Error ? err.message : String(err)}` };
      return;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        const text = block.text.trim();
        yield { type: "trace", message: `Agent: ${text.slice(0, 160)}${text.length > 160 ? "..." : ""}` };
      }

      if (block.type === "tool_use") {
        const toolInput = block.input as Record<string, unknown>;
        yield { type: "tool_call", tool: block.name, input: toolInput };

        let resultPayload: unknown;
        let summary = "";

        try {
          if (block.name === "fetch_feedback_sources") {
            const requested = (toolInput.sources as string[]) ?? sources;
            const items = fetchFeedbackSources(requested);
            state.feedback = items;
            const bySource = new Map<string, number>();
            for (const it of items) {
              const key = it.source.split(" ")[0];
              bySource.set(key, (bySource.get(key) ?? 0) + 1);
            }
            const breakdown = Array.from(bySource.entries()).map(([k, v]) => `${k}:${v}`).join(", ");
            summary = `Fetched ${items.length} feedback items across ${requested.length} sources (${breakdown})`;
            resultPayload = { total_items: items.length, sources_loaded: requested, by_source: Object.fromEntries(bySource) };
            yield { type: "tool_result", tool: block.name, summary };
          } else if (block.name === "get_crm_segments") {
            const crm = getCRMSegments();
            state.crm = crm;
            const segNames = Object.values(crm.segments).map((s) => `${s.label} ${s.customers}c`).join(" · ");
            summary = `Loaded CRM: ${crm.total_customers} customers, $${(crm.total_arr / 1_000_000).toFixed(1)}M ARR (${segNames})`;
            const recentChurned = Object.values(crm.segments).reduce((acc, s) => acc + (s.recent_churned_arr_90d ?? 0), 0);
            resultPayload = {
              total_customers: crm.total_customers,
              total_arr: crm.total_arr,
              recent_churned_arr_90d: recentChurned,
              segments: Object.fromEntries(
                Object.entries(crm.segments).map(([k, s]) => [k, {
                  label: s.label,
                  customers: s.customers,
                  total_arr: s.total_arr,
                  nps_current: s.nps_current,
                  nps_trend_6mo: s.nps_trend_6mo,
                  recent_churned_arr_90d: s.recent_churned_arr_90d,
                  top_at_risk_count: s.top_at_risk_accounts?.length ?? 0,
                }]),
              ),
            };
            yield { type: "tool_result", tool: block.name, summary };
          } else if (block.name === "synthesize_themes") {
            if (!state.feedback) {
              throw new Error("synthesize_themes called before fetch_feedback_sources");
            }
            yield { type: "trace", message: `Clustering ${state.feedback.length} items into themes...` };
            const themeFocus = (toolInput.focus as string | undefined) ?? state.focus;
            const themes = await synthesizeThemesFromFeedback(state.feedback, themeFocus);
            state.themes = themes;
            const sevCounts = themes.reduce<Record<string, number>>((acc, t) => {
              acc[t.severity] = (acc[t.severity] ?? 0) + 1;
              return acc;
            }, {});
            const sevSummary = Object.entries(sevCounts).map(([k, v]) => `${v} ${k}`).join(", ");
            summary = `Synthesized ${themes.length} themes (${sevSummary})`;
            resultPayload = {
              theme_count: themes.length,
              themes: themes.map((t) => ({
                name: t.name,
                severity: t.severity,
                affected_segments: t.affected_segments,
                frequency: t.frequency,
                evidence_count: t.evidence?.length ?? 0,
              })),
            };
            yield { type: "tool_result", tool: block.name, summary };
          } else if (block.name === "calculate_reach_impact") {
            if (!state.themes || !state.crm) {
              throw new Error("calculate_reach_impact called before themes/crm are ready");
            }
            const impact = computeImpact(state.themes, state.crm);
            state.impact = impact;
            const totalARR = impact.reduce((s, i) => s + i.arr_at_risk, 0);
            const namedCount = impact.reduce((s, i) => s + i.named_at_risk_accounts.length, 0);
            summary = `Calculated impact: $${(totalARR / 1_000_000).toFixed(1)}M ARR at risk · ${namedCount} named at-risk accounts mapped`;
            resultPayload = {
              total_arr_at_risk: totalARR,
              themes: impact.map((i) => ({
                theme_name: i.theme_name,
                customers_affected: i.customers_affected,
                arr_at_risk: i.arr_at_risk,
                arr_at_risk_pct: i.arr_at_risk_pct,
                named_at_risk_accounts: i.named_at_risk_accounts.map((a) => a.name),
              })),
            };
            yield { type: "tool_result", tool: block.name, summary };
          } else if (block.name === "generate_prioritized_brief") {
            if (!state.themes || !state.impact) {
              throw new Error("generate_prioritized_brief called before themes/impact are ready");
            }
            const brief = buildBrief(state.themes, state.impact);
            finalBrief = brief;
            summary = `Generated prioritized brief with ${brief.length} ranked items`;
            resultPayload = {
              brief_count: brief.length,
              top_theme: brief[0]?.theme_name,
              top_arr_at_risk: brief[0]?.arr_at_risk,
            };
            yield { type: "tool_result", tool: block.name, summary };
            for (const item of brief) {
              yield { type: "theme", data: item };
              await new Promise((r) => setTimeout(r, 250));
            }
          } else {
            resultPayload = { error: `Unknown tool: ${block.name}` };
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          yield { type: "trace", message: `Tool error (${block.name}): ${message}` };
          resultPayload = { error: message };
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(resultPayload ?? {}),
        });
      }
    }

    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
    }

    if (response.stop_reason === "end_turn" && toolResults.length === 0) {
      break;
    }
    if (finalBrief) {
      // Brief emitted — let the agent finish its turn naturally
      if (response.stop_reason === "end_turn") break;
    }
  }

  if (!finalBrief && state.themes && state.impact) {
    // Fallback: model didn't call generate_prioritized_brief but we have everything we need
    yield { type: "trace", message: "Composing brief from synthesized themes..." };
    const brief = buildBrief(state.themes, state.impact);
    finalBrief = brief;
    yield {
      type: "tool_result",
      tool: "generate_prioritized_brief",
      summary: `Generated prioritized brief with ${brief.length} ranked items`,
    };
    for (const item of brief) {
      yield { type: "theme", data: item };
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (finalBrief) {
    const totalARR = finalBrief.reduce((s, i) => s + i.arr_at_risk, 0);
    const totalCustomers = finalBrief.reduce((s, i) => s + i.customers_affected, 0);
    yield {
      type: "complete",
      total_themes: finalBrief.length,
      total_arr_at_risk: totalARR,
      total_customers: totalCustomers,
    };
  } else {
    yield { type: "error", message: "Agent did not produce a brief. Check API key and try again." };
  }
}
