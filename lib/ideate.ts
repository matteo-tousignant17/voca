import Anthropic from "@anthropic-ai/sdk";
import type { BriefItem, ToolResultDetail } from "./agent";
import {
  DEMO_COLLABORATION_DATA_LOSS_THEME,
  DEMO_COLLABORATION_IDEATE_APPROACHES,
  COLLABORATION_IDEATE_FOCUS_MARKER,
} from "./demo_ideate_examples";

export type IdeaLens = "competitor" | "workflow" | "automation" | "agent";

export type IdeaItem = {
  id: string;
  theme_name: string;
  lens: IdeaLens;
  title: string;
  summary: string;
  key_insight: string;
  tactics: string[];
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  timeframe: string;
};

export type IdeaEvent =
  | { type: "trace"; message: string }
  | { type: "tool_call"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; summary: string; details?: ToolResultDetail }
  | { type: "idea"; data: IdeaItem }
  | { type: "idea_complete"; total_ideas: number }
  | { type: "error"; message: string };

const client = new Anthropic();

type InsightItem = {
  theme_name: string;
  idea_title: string;
  idea_summary: string;
  key_insight: string;
  tactics: string[];
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  timeframe: string;
};

const IDEATE_TOOLS: Anthropic.Tool[] = [
  {
    name: "analyze_competitor_landscape",
    description:
      "For each theme, analyze what direct competitors (Confluence, Coda, Linear, Airtable, Asana, Notion AI competitors) do to address this pain. Identify the specific gap Notion can exploit and a concrete product idea.",
    input_schema: {
      type: "object" as const,
      properties: {
        themes: { type: "array", items: { type: "object" }, description: "Top-ranked themes with problem statements" },
        insights: {
          type: "array",
          description: "One insight per theme with a concrete competitor-informed product idea",
          items: {
            type: "object",
            properties: {
              theme_name: { type: "string" },
              competitor_approaches: { type: "array", items: { type: "string" } },
              gap_to_exploit: { type: "string" },
              idea_title: { type: "string" },
              idea_summary: { type: "string" },
              key_insight: { type: "string" },
              tactics: { type: "array", items: { type: "string" } },
              effort: { type: "string", enum: ["low", "medium", "high"] },
              impact: { type: "string", enum: ["low", "medium", "high"] },
              timeframe: { type: "string" },
            },
            required: ["theme_name", "idea_title", "idea_summary", "key_insight", "tactics", "effort", "impact", "timeframe"],
          },
        },
      },
      required: ["themes", "insights"],
    },
  },
  {
    name: "map_workflow_opportunities",
    description:
      "For each theme, map the exact step(s) in a user's daily workflow where the pain occurs. Identify integration touchpoints (Slack, Jira, Figma, Google Drive, calendar) and propose a workflow redesign or deep integration.",
    input_schema: {
      type: "object" as const,
      properties: {
        themes: { type: "array", items: { type: "object" } },
        insights: {
          type: "array",
          description: "One insight per theme focused on workflow redesign",
          items: {
            type: "object",
            properties: {
              theme_name: { type: "string" },
              workflow_step_pain: { type: "string" },
              integration_touchpoints: { type: "array", items: { type: "string" } },
              idea_title: { type: "string" },
              idea_summary: { type: "string" },
              key_insight: { type: "string" },
              tactics: { type: "array", items: { type: "string" } },
              effort: { type: "string", enum: ["low", "medium", "high"] },
              impact: { type: "string", enum: ["low", "medium", "high"] },
              timeframe: { type: "string" },
            },
            required: ["theme_name", "idea_title", "idea_summary", "key_insight", "tactics", "effort", "impact", "timeframe"],
          },
        },
      },
      required: ["themes", "insights"],
    },
  },
  {
    name: "design_automation_solutions",
    description:
      "For each theme, design trigger/action automation patterns that would eliminate the pain. Think: what event should trigger automation, what action fires, what rule/condition governs it. Reference Notion's existing automation primitives.",
    input_schema: {
      type: "object" as const,
      properties: {
        themes: { type: "array", items: { type: "object" } },
        insights: {
          type: "array",
          description: "One insight per theme focused on automation patterns",
          items: {
            type: "object",
            properties: {
              theme_name: { type: "string" },
              trigger: { type: "string" },
              action: { type: "string" },
              idea_title: { type: "string" },
              idea_summary: { type: "string" },
              key_insight: { type: "string" },
              tactics: { type: "array", items: { type: "string" } },
              effort: { type: "string", enum: ["low", "medium", "high"] },
              impact: { type: "string", enum: ["low", "medium", "high"] },
              timeframe: { type: "string" },
            },
            required: ["theme_name", "idea_title", "idea_summary", "key_insight", "tactics", "effort", "impact", "timeframe"],
          },
        },
      },
      required: ["themes", "insights"],
    },
  },
  {
    name: "design_agent_solutions",
    description:
      "For each theme, design an AI/agent-native solution. Think: proactive agents that monitor context and act autonomously, agentic workflows with multi-step reasoning, LLM-powered features that replace manual work entirely.",
    input_schema: {
      type: "object" as const,
      properties: {
        themes: { type: "array", items: { type: "object" } },
        insights: {
          type: "array",
          description: "One insight per theme focused on agent/AI-native solutions",
          items: {
            type: "object",
            properties: {
              theme_name: { type: "string" },
              agent_capability: { type: "string" },
              agentic_workflow: { type: "string" },
              idea_title: { type: "string" },
              idea_summary: { type: "string" },
              key_insight: { type: "string" },
              tactics: { type: "array", items: { type: "string" } },
              effort: { type: "string", enum: ["low", "medium", "high"] },
              impact: { type: "string", enum: ["low", "medium", "high"] },
              timeframe: { type: "string" },
            },
            required: ["theme_name", "idea_title", "idea_summary", "key_insight", "tactics", "effort", "impact", "timeframe"],
          },
        },
      },
      required: ["themes", "insights"],
    },
  },
  {
    name: "compile_ideas",
    description:
      "Takes the raw insights from all four lens tools and compiles them into a final structured idea list. Each idea gets a lens tag and is ready for product review.",
    input_schema: {
      type: "object" as const,
      properties: {
        competitor_insights: { type: "array", items: { type: "object" } },
        workflow_insights: { type: "array", items: { type: "object" } },
        automation_insights: { type: "array", items: { type: "object" } },
        agent_insights: { type: "array", items: { type: "object" } },
        ideas: {
          type: "array",
          description: "Final structured idea list, one per theme per lens, with lens field",
          items: {
            type: "object",
            properties: {
              theme_name: { type: "string" },
              lens: { type: "string", enum: ["competitor", "workflow", "automation", "agent"] },
              title: { type: "string" },
              summary: { type: "string" },
              key_insight: { type: "string" },
              tactics: { type: "array", items: { type: "string" } },
              effort: { type: "string", enum: ["low", "medium", "high"] },
              impact: { type: "string", enum: ["low", "medium", "high"] },
              timeframe: { type: "string" },
            },
            required: ["theme_name", "lens", "title", "summary", "key_insight", "tactics", "effort", "impact", "timeframe"],
          },
        },
      },
      required: ["ideas"],
    },
  },
];

const LENS_ORDER: IdeaLens[] = ["competitor", "workflow", "automation", "agent"];

function executeIdeateTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  lensState: Map<string, InsightItem[]>
): unknown {
  const lensMap: Record<string, IdeaLens> = {
    analyze_competitor_landscape: "competitor",
    map_workflow_opportunities: "workflow",
    design_automation_solutions: "automation",
    design_agent_solutions: "agent",
  };

  if (lensMap[toolName]) {
    const insights = (toolInput.insights as InsightItem[]) || [];
    lensState.set(lensMap[toolName], insights);
    return { stored: insights.length };
  }

  if (toolName === "compile_ideas") {
    return toolInput.ideas || [];
  }

  return {};
}

export async function* runIdeateAgent(
  themes: BriefItem[],
  focus?: string,
): AsyncGenerator<IdeaEvent> {
  const trimmedFocus = focus?.trim();
  const top3 = [...themes].sort((a, b) => b.arr_at_risk - a.arr_at_risk).slice(0, 3);

  yield { type: "trace", message: `Ideating over top ${top3.length} themes by ARR...` };
  yield { type: "trace", message: `Themes: ${top3.map((t) => t.theme_name).join(", ")}` };
  if (trimmedFocus) {
    yield {
      type: "trace",
      message: `Focus: ${trimmedFocus.slice(0, 120)}${trimmedFocus.length > 120 ? "…" : ""}`,
    };
  }

  const focusClause = trimmedFocus
    ? `\n\nFOCUS INSTRUCTION: Anchor every idea to this specific theme and prompt — ${trimmedFocus}. Ideas for other themes may be included but should support the focus.`
    : "";

  const collaborationThreeApproachMode =
    !!trimmedFocus &&
    trimmedFocus.includes(COLLABORATION_IDEATE_FOCUS_MARKER) &&
    top3.some((t) => t.theme_name === DEMO_COLLABORATION_DATA_LOSS_THEME);

  if (collaborationThreeApproachMode) {
    yield {
      type: "trace",
      message: `Collaboration demo: ideas must advance three root-cause approaches — (${DEMO_COLLABORATION_IDEATE_APPROACHES.map((_, i) => i + 1).join(", ")}).`,
    };
  }

  const collaborationClause = collaborationThreeApproachMode
    ? `

ROOT PROBLEM LOCK-IN FOR "${DEMO_COLLABORATION_DATA_LOSS_THEME}": The core failure mode is simultaneous collaboration and sync resolving in a way that loses or destroys user-visible content (not cosmetic UI glitches).

MANDATORY COVERAGE: The final compiled ideas for "${DEMO_COLLABORATION_DATA_LOSS_THEME}" MUST reflect these three strategic approaches (one primary idea per approach minimum, each with a different lens where possible—competitor, workflow, automation, agent):
1. ${DEMO_COLLABORATION_IDEATE_APPROACHES[0]}
2. ${DEMO_COLLABORATION_IDEATE_APPROACHES[1]}
3. ${DEMO_COLLABORATION_IDEATE_APPROACHES[2]}

In each such idea's key_insight, briefly state which approach number (1–3) it primarily advances. You may still output the full 12 ideas across themes; for this theme, do not merge these three into a single generic "fix collaboration" idea.`
    : "";

  const systemPrompt = `You are a product ideation agent specializing in B2B SaaS. You have been given the top 3 customer problems ranked by ARR at risk from a Voice of Customer analysis of Notion.${focusClause}${collaborationClause}

Your job: generate one high-quality product idea per theme per lens — 4 lenses × 3 themes = 12 ideas total.

The 4 lenses you must explore in this exact order:
1. Competitor (analyze_competitor_landscape) — what does Confluence, Coda, Linear, Airtable, or Asana do about this? What is the specific gap Notion can own?
2. Workflow (map_workflow_opportunities) — where exactly in the user's daily workflow does this pain hit? What workflow redesign or integration would eliminate it?
3. Automation (design_automation_solutions) — what trigger/action automation pattern eliminates this pain? What is currently manual that should be automatic?
4. Agent/AI (design_agent_solutions) — how could an AI agent proactively solve this? What agentic, multi-step, context-aware workflow is now possible?

For every idea you MUST provide:
- A specific, concrete title (e.g., "Auto-sync offline changes via background service worker", NOT "improve offline support")
- A 1-sentence summary
- The key insight from this lens that drives the idea
- 2–3 concrete tactics specific enough for a sprint ticket
- Effort: low (< 1 week), medium (1–3 weeks), high (> 1 month)
- Impact: high/medium/low based on ARR at risk
- Timeframe: e.g., "1 sprint", "2–4 weeks", "next quarter"

Call tools in this order:
1. analyze_competitor_landscape — pass the themes and your competitor insights
2. map_workflow_opportunities — pass the themes and your workflow insights
3. design_automation_solutions — pass the themes and your automation insights
4. design_agent_solutions — pass the themes and your agent insights
5. compile_ideas — pass all four insight arrays and the final compiled ideas array

Be specific. Reference actual Notion behavior and named competitors. Ideas must be buildable, not moonshots.`;

  const baseUserTurn = `Generate product ideas for these top 3 customer problems ranked by ARR at risk:\n\n${top3
    .map(
      (t, i) =>
        `${i + 1}. **${t.theme_name}** (${t.severity}, $${(t.arr_at_risk / 1000).toFixed(0)}K ARR at risk, ${t.customers_affected} customers)\n   ${t.problem_statement}`
    )
    .join("\n\n")}\n\nCall all 5 tools in order and compile 12 ideas (4 lenses × 3 themes).`;

  const userTurn =
    collaborationThreeApproachMode && top3[0]?.theme_name === DEMO_COLLABORATION_DATA_LOSS_THEME
      ? `${baseUserTurn}\n\nCRITICAL: "${DEMO_COLLABORATION_DATA_LOSS_THEME}" is the focus theme. In compile_ideas, include at least three distinct ideas for that theme—one that clearly advances strategic approach 1, one for approach 2, and one for approach 3 from the system prompt. Tag which approach (1–3) in each idea's key_insight.`
      : baseUserTurn;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userTurn }];

  const lensState = new Map<string, InsightItem[]>();
  let finalIdeas: IdeaItem[] | null = null;

  for (let iteration = 0; iteration < 8; iteration++) {
    yield { type: "trace", message: `Ideation turn ${iteration + 1}...` };

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      tools: IDEATE_TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        yield {
          type: "trace",
          message: `${block.text.slice(0, 100)}${block.text.length > 100 ? "..." : ""}`,
        };
      }

      if (block.type === "tool_use") {
        const toolInput = block.input as Record<string, unknown>;

        yield { type: "tool_call", tool: block.name, input: toolInput };

        const result = executeIdeateTool(block.name, toolInput, lensState);

        if (block.name === "compile_ideas") {
          const raw = (toolInput.ideas as Array<{
            theme_name: string;
            lens: IdeaLens;
            title: string;
            summary: string;
            key_insight: string;
            tactics: string[];
            effort: "low" | "medium" | "high";
            impact: "low" | "medium" | "high";
            timeframe: string;
          }>) || [];

          // Sort by theme (ARR order) then lens order
          const themeOrder = new Map(top3.map((t, i) => [t.theme_name, i]));
          const sorted = [...raw].sort((a, b) => {
            const tA = themeOrder.get(a.theme_name) ?? 99;
            const tB = themeOrder.get(b.theme_name) ?? 99;
            if (tA !== tB) return tA - tB;
            return LENS_ORDER.indexOf(a.lens) - LENS_ORDER.indexOf(b.lens);
          });

          finalIdeas = sorted.map((idea, i) => ({
            ...idea,
            id: `${idea.lens}-${i}`,
          }));

          yield {
            type: "tool_result",
            tool: block.name,
            summary: `Compiled ${finalIdeas.length} ideas across ${new Set(finalIdeas.map((i) => i.lens)).size} lenses`,
          };

          for (const idea of finalIdeas) {
            yield { type: "idea", data: idea };
            await new Promise((r) => setTimeout(r, 200));
          }
        } else {
          const insights = lensState.get(
            ({ analyze_competitor_landscape: "competitor", map_workflow_opportunities: "workflow", design_automation_solutions: "automation", design_agent_solutions: "agent" } as Record<string, IdeaLens>)[block.name]
          );
          yield {
            type: "tool_result",
            tool: block.name,
            summary: `Stored ${insights?.length ?? 0} ${block.name.replace(/_/g, " ").replace("analyze ", "").replace("map ", "").replace("design ", "")} insights`,
          };
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

    if (response.stop_reason === "end_turn") break;
  }

  yield { type: "idea_complete", total_ideas: finalIdeas?.length ?? 0 };
}
