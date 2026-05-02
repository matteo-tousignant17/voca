import Anthropic from "@anthropic-ai/sdk";
import { fetchFeedbackSources, type FeedbackItem } from "./tools/fetch_feedback";
import { getCRMSegments, type CRMData } from "./tools/get_crm";

const client = new Anthropic();

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
};

export type AgentEvent =
  | { type: "trace"; message: string }
  | { type: "tool_call"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; summary: string }
  | { type: "theme"; data: BriefItem }
  | { type: "complete"; total_themes: number; total_arr_at_risk: number; total_customers: number }
  | { type: "error"; message: string };

const TOOLS: Anthropic.Tool[] = [
  {
    name: "fetch_feedback_sources",
    description:
      "Fetches all customer feedback from the specified sources. Returns raw feedback items with text, source metadata, and company tier information.",
    input_schema: {
      type: "object" as const,
      properties: {
        sources: {
          type: "array",
          items: { type: "string", enum: ["reddit", "g2", "gong", "support_tickets"] },
          description: "List of feedback sources to fetch",
        },
      },
      required: ["sources"],
    },
  },
  {
    name: "get_crm_segments",
    description:
      "Retrieves CRM customer segmentation data from Salesforce including customer counts, ARR, and churn rates by tier (SMB, Mid-Market, Enterprise).",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "synthesize_themes",
    description:
      "Analyzes feedback items and clusters them into distinct problem themes. Each theme includes a name, problem statement, supporting evidence quotes, and severity.",
    input_schema: {
      type: "object" as const,
      properties: {
        feedback: {
          type: "array",
          items: { type: "object" },
          description: "Array of feedback items to analyze",
        },
      },
      required: ["feedback"],
    },
  },
  {
    name: "calculate_reach_impact",
    description:
      "Cross-references themes with CRM data to calculate how many customers are affected and how much ARR is at risk for each theme.",
    input_schema: {
      type: "object" as const,
      properties: {
        themes: {
          type: "array",
          items: { type: "object" },
          description: "Synthesized themes with segment data",
        },
        crm: {
          type: "object",
          description: "CRM segmentation data",
        },
      },
      required: ["themes", "crm"],
    },
  },
  {
    name: "generate_prioritized_brief",
    description:
      "Produces the final prioritized output: ranked themes with evidence, ARR impact, tradeoff analysis, and a suggested next action for each.",
    input_schema: {
      type: "object" as const,
      properties: {
        themes: {
          type: "array",
          items: { type: "object" },
          description: "Synthesized themes",
        },
        impact: {
          type: "array",
          items: { type: "object" },
          description: "Impact data per theme",
        },
      },
      required: ["themes", "impact"],
    },
  },
];

function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  state: { feedback?: FeedbackItem[]; crm?: CRMData; themes?: Theme[]; impact?: ImpactData[] }
): unknown {
  if (toolName === "fetch_feedback_sources") {
    const sources = toolInput.sources as string[];
    const items = fetchFeedbackSources(sources);
    state.feedback = items;
    return items;
  }

  if (toolName === "get_crm_segments") {
    const crm = getCRMSegments();
    state.crm = crm;
    return crm;
  }

  if (toolName === "synthesize_themes") {
    // The AI does the synthesis — we just pass through what Claude returned via tool input
    // In practice Claude will call this tool with the themes it synthesized
    const themes = toolInput.themes as Theme[];
    state.themes = themes;
    return { synthesized: themes?.length ?? 0, themes };
  }

  if (toolName === "calculate_reach_impact") {
    const themes = (toolInput.themes as Theme[]) || state.themes || [];
    const crm = (toolInput.crm as CRMData) || state.crm!;

    const impact: ImpactData[] = themes.map((theme) => {
      const segments = theme.affected_segments || [];
      let totalCustomers = 0;
      let totalARR = 0;
      const breakdown: Record<string, { customers: number; arr: number }> = {};

      for (const seg of segments) {
        const segKey = seg.toLowerCase().replace(/-/g, "_").replace(/ /g, "_");
        const segData = crm.segments[segKey] || crm.segments[Object.keys(crm.segments).find(k => k.includes(segKey.split("_")[0])) || ""];
        if (segData) {
          // Estimate % of segment affected based on severity
          const pct =
            theme.severity === "critical" ? 0.6 :
            theme.severity === "high" ? 0.4 :
            theme.severity === "medium" ? 0.25 : 0.1;
          const cust = Math.round(segData.customers * pct);
          const arr = Math.round(cust * segData.avg_arr);
          breakdown[segData.label] = { customers: cust, arr };
          totalCustomers += cust;
          totalARR += arr;
        }
      }

      // Fallback if no segments matched
      if (totalCustomers === 0) {
        const pct = theme.severity === "critical" ? 0.35 : theme.severity === "high" ? 0.2 : 0.1;
        totalCustomers = Math.round(crm.total_customers * pct);
        totalARR = Math.round(crm.total_arr * pct * 0.5);
      }

      return {
        theme_name: theme.name,
        customers_affected: totalCustomers,
        arr_at_risk: totalARR,
        arr_at_risk_pct: Math.round((totalARR / crm.total_arr) * 100),
        segment_breakdown: breakdown,
      };
    });

    state.impact = impact;
    return impact;
  }

  if (toolName === "generate_prioritized_brief") {
    const themes = (toolInput.themes as Theme[]) || state.themes || [];
    const impact = (toolInput.impact as ImpactData[]) || state.impact || [];

    const impactMap = new Map(impact.map((i) => [i.theme_name, i]));

    const brief: BriefItem[] = themes
      .map((theme, idx) => {
        const imp = impactMap.get(theme.name) || {
          customers_affected: 0,
          arr_at_risk: 0,
          arr_at_risk_pct: 0,
          segment_breakdown: {},
        };

        const effortMap: Record<string, string> = {
          critical: "High",
          high: "Medium-High",
          medium: "Medium",
          low: "Low",
        };

        const segKeys = Object.keys(imp.segment_breakdown || {});
        const segSkew = segKeys.length > 0 ? segKeys.join(" + ") + "-skewed" : "Broad";

        return {
          rank: idx + 1,
          theme_name: theme.name,
          problem_statement: theme.problem_statement,
          evidence: (theme.evidence || []).slice(0, 3),
          customers_affected: imp.customers_affected,
          arr_at_risk: imp.arr_at_risk,
          arr_at_risk_pct: imp.arr_at_risk_pct,
          severity: theme.severity,
          tradeoffs: {
            effort: effortMap[theme.severity] || "Medium",
            impact: theme.severity === "critical" ? "Very High retention impact" : theme.severity === "high" ? "High retention impact" : "Moderate retention impact",
            segment_skew: segSkew,
          },
          suggested_action: `Address ${theme.name.toLowerCase()} — estimated ${imp.arr_at_risk_pct}% ARR at risk ($${(imp.arr_at_risk / 1000).toFixed(0)}K). ${theme.severity === "critical" ? "Immediate investigation sprint recommended." : "Schedule for next planning cycle."}`,
        };
      })
      .sort((a, b) => b.arr_at_risk - a.arr_at_risk)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    return brief;
  }

  return { error: `Unknown tool: ${toolName}` };
}

export async function* runVoCAgent(sources: string[], focus?: string): AsyncGenerator<AgentEvent> {
  yield { type: "trace", message: "Initializing VoC synthesis agent..." };
  yield { type: "trace", message: `Sources queued: ${sources.join(", ")}` };
  if (focus && focus !== "general") {
    yield { type: "trace", message: `Focus: ${focus.slice(0, 80)}${focus.length > 80 ? "..." : ""}` };
  }

  const focusClause = focus && focus !== "general" && focus !== "custom"
    ? `\n\nFOCUS INSTRUCTION: ${focus}`
    : "";

  const systemPrompt = `You are a Voice of Customer synthesis agent for product managers. Your job is to:
1. Fetch feedback from all available sources
2. Get CRM customer data from Salesforce
3. Synthesize feedback into distinct problem themes (4-6 themes max)
4. Calculate the ARR and customer reach impact for each theme
5. Generate a prioritized, evidence-backed brief

When calling synthesize_themes, you MUST include the full themes array in the tool input with this structure:
{
  "themes": [
    {
      "name": "Theme Name",
      "problem_statement": "Clear description of the problem",
      "affected_segments": ["smb", "mid_market", "enterprise"],
      "evidence": [
        { "quote": "exact customer quote", "source": "Reddit/G2/Gong/Support Ticket", "company_size": "Enterprise" }
      ],
      "frequency": 8,
      "severity": "critical"
    }
  ]
}

Severity levels: critical (churn risk, data loss, security), high (major friction, blocking expansion), medium (quality of life), low (nice to have).
Affected segments must use these exact values: "smb", "mid_market", "enterprise".

Be thorough. Use real quotes from the feedback. Identify 4-6 distinct themes.
After synthesize_themes, call calculate_reach_impact, then generate_prioritized_brief.${focusClause}`;

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Analyze all customer feedback for Notion from these sources: ${sources.join(", ")}.
Fetch the feedback, get CRM data, synthesize themes, calculate impact, and generate a prioritized brief.
Be sure to include the full themes data when calling synthesize_themes.`,
    },
  ];

  const state: { feedback?: FeedbackItem[]; crm?: CRMData; themes?: Theme[]; impact?: ImpactData[] } = {};
  let finalBrief: BriefItem[] | null = null;

  // Agentic loop
  for (let iteration = 0; iteration < 10; iteration++) {
    yield { type: "trace", message: `Agent turn ${iteration + 1}...` };

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    // Collect assistant message
    messages.push({ role: "assistant", content: response.content });

    // Process content blocks
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        yield { type: "trace", message: `Agent: ${block.text.slice(0, 120)}${block.text.length > 120 ? "..." : ""}` };
      }

      if (block.type === "tool_use") {
        const toolInput = block.input as Record<string, unknown>;

        yield {
          type: "tool_call",
          tool: block.name,
          input: toolInput,
        };

        const result = executeTool(block.name, toolInput, state);

        // Emit summaries for trace
        if (block.name === "fetch_feedback_sources") {
          const items = result as FeedbackItem[];
          yield { type: "tool_result", tool: block.name, summary: `Fetched ${items.length} feedback items across ${(toolInput.sources as string[]).length} sources` };
        } else if (block.name === "get_crm_segments") {
          const crm = result as CRMData;
          yield { type: "tool_result", tool: block.name, summary: `Loaded CRM: ${crm.total_customers} customers, $${(crm.total_arr / 1000000).toFixed(1)}M total ARR` };
        } else if (block.name === "synthesize_themes") {
          const r = result as { synthesized: number };
          yield { type: "tool_result", tool: block.name, summary: `Synthesized ${r.synthesized} themes from feedback` };
        } else if (block.name === "calculate_reach_impact") {
          const impacts = result as ImpactData[];
          const totalARR = impacts.reduce((s, i) => s + i.arr_at_risk, 0);
          yield { type: "tool_result", tool: block.name, summary: `Calculated impact: $${(totalARR / 1000000).toFixed(1)}M ARR at risk across ${impacts.length} themes` };
        } else if (block.name === "generate_prioritized_brief") {
          const brief = result as BriefItem[];
          finalBrief = brief;
          yield { type: "tool_result", tool: block.name, summary: `Generated prioritized brief with ${brief.length} ranked items` };
          // Stream each theme card
          for (const item of brief) {
            yield { type: "theme", data: item };
            // Small delay for visual effect — progressive reveal
            await new Promise((r) => setTimeout(r, 300));
          }
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
    }

    if (response.stop_reason === "end_turn") {
      break;
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
