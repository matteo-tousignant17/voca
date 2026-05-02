import type { BriefItem } from "./agent";
import type { IdeaEvent, IdeaItem, IdeaLens, IdeationResultSummaryRow } from "./ideate";
import {
  DEMO_COLLABORATION_DATA_LOSS_THEME,
  COLLABORATION_IDEATE_FOCUS_MARKER,
  DEMO_COLLABORATION_IDEATE_APPROACHES,
} from "./demo_ideate_examples";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Top N themes by ARR, same slice as runIdeateAgent. */
function topThemesByArr(themes: BriefItem[], n: number): BriefItem[] {
  return [...themes].sort((a, b) => b.arr_at_risk - a.arr_at_risk).slice(0, n);
}

const LENS_ORDER: IdeaLens[] = ["competitor", "workflow", "automation", "agent"];

/**
 * Deterministic ideation stream for demo mode (no API key). Mirrors the 5-tool lens pass
 * and emits 4 ideas per theme in the top slice, with special coverage for collaboration focus.
 */
export async function* runDemoIdeateAgent(
  themes: BriefItem[],
  focus?: string,
): AsyncGenerator<IdeaEvent> {
  const trimmed = focus?.trim();
  const top3 = topThemesByArr(themes, 3);

  yield { type: "trace", message: "Running ideation in demo mode (deterministic playback)" };
  yield { type: "trace", message: `Ideating over top ${top3.length} themes by ARR...` };
  yield { type: "trace", message: `Themes: ${top3.map((t) => t.theme_name).join(", ")}` };
  if (trimmed) {
    yield {
      type: "trace",
      message: `Focus: ${trimmed.slice(0, 140)}${trimmed.length > 140 ? "…" : ""}`,
    };
  }

  const collaborationFocus =
    !!trimmed &&
    trimmed.includes(COLLABORATION_IDEATE_FOCUS_MARKER) &&
    top3.some((t) => t.theme_name === DEMO_COLLABORATION_DATA_LOSS_THEME);

  if (collaborationFocus) {
    yield {
      type: "trace",
      message:
        "Collaboration demo: compiling ideas for three root-cause approaches — merge model, safety net, trust & recovery.",
    };
  }

  const toolNames = [
    "analyze_competitor_landscape",
    "map_workflow_opportunities",
    "design_automation_solutions",
    "design_agent_solutions",
  ] as const;

  for (let turn = 0; turn < toolNames.length; turn++) {
    yield { type: "trace", message: `Ideation turn ${turn + 1}…` };
    const tool = toolNames[turn];
    yield { type: "tool_call", tool, input: { themes: top3.map((t) => t.theme_name) } };
    await sleep(280);
    yield {
      type: "tool_result",
      tool,
      summary: `Stored lens insights for ${top3.length} themes (${tool.replace(/_/g, " ")})`,
    };
    await sleep(200);
  }

  yield { type: "trace", message: "Ideation turn 5 — compiling ideas…" };
  yield {
    type: "tool_call",
    tool: "compile_ideas",
    input: { themes: top3.map((t) => t.theme_name) },
  };
  await sleep(400);

  const ideasOut: IdeaItem[] = [];

  for (let ti = 0; ti < top3.length; ti++) {
    const theme = top3[ti];
    const isCollaboration = theme.theme_name === DEMO_COLLABORATION_DATA_LOSS_THEME;
    let lensIdx = 0;

    for (const lens of LENS_ORDER) {
      const id = `${lens}-${ti}-${ideasOut.length}`;
      let key_insight = `Lens-focused idea for "${theme.theme_name}" (${lens}).`;
      let title: string;
      let summary: string;
      const tactics: string[] = [
        "Define success metrics with design + eng in week 1",
        "Ship behind a workspace admin flag for enterprise pilots",
        "Document recovery path in help center + in-app coach mark",
      ];

      if (collaborationFocus && isCollaboration) {
        const approachNum = (lensIdx % 3) + 1;
        lensIdx += 1;
        const approach = DEMO_COLLABORATION_IDEATE_APPROACHES[(approachNum - 1) % 3];
        key_insight = `Advances approach ${approachNum}/3: ${approach.slice(0, 90)}… — ${lens} lens.`;
        if (lens === "competitor") {
          title = "Conflict-aware block merge with competitor parity checklist";
          summary =
            "Ship explicit merge previews and non-destructive conflict resolution inspired by strongest docs rivals, positioned as renewal trust recovery.";
        } else if (lens === "workflow") {
          title = "Collaboration safety lane: staged sync before publish";
          summary =
            "Let teams opt into review-and-apply for high-stakes docs so realtime never silently overwrites.";
        } else if (lens === "automation") {
          title = "Auto-checkpoint automation on simultaneous editors";
          summary =
            "When multiple editors converge on same subtree, autosave checkpoints and ping owners before reconcile.";
        } else {
          title = "Incident copilot: explain sync events + one-click restore";
          summary =
            "Agent surfaces what changed during a session, links to version history, and proposes restore bundles for admins.";
        }
      } else {
        title = `${theme.theme_name.slice(0, 48)} — ${lens} bet`;
        summary = `Concrete ${lens} angle on the stated problem, sized for a single squad.`;
        key_insight = `${lens}: reduce ARR risk by closing a specific gap for ${theme.customers_affected.toLocaleString()} affected customers.`;
      }

      ideasOut.push({
        id,
        theme_name: theme.theme_name,
        lens,
        title,
        summary,
        key_insight,
        tactics,
        effort: lens === "competitor" || lens === "workflow" ? "high" : "medium",
        impact: theme.severity === "critical" ? "high" : "medium",
        timeframe: lens === "agent" ? "2–4 weeks" : "1 sprint",
      });
    }
  }

  yield {
    type: "tool_result",
    tool: "compile_ideas",
    summary: `Compiled ${ideasOut.length} ideas across ${LENS_ORDER.length} lenses`,
  };

  for (const idea of ideasOut) {
    yield { type: "idea", data: idea };
    await sleep(120);
  }

  const themeCount = new Set(ideasOut.map((i) => i.theme_name)).size;
  const ideas_detail: IdeationResultSummaryRow[] = ideasOut.map((i) => ({
    theme_name: i.theme_name,
    lens: i.lens,
    title: i.title,
    summary: i.summary,
    key_insight: i.key_insight,
    tactics: i.tactics,
    effort: i.effort,
    impact: i.impact,
    timeframe: i.timeframe,
  }));

  yield {
    type: "idea_complete",
    total_ideas: ideasOut.length,
    trace_lines: [
      `✓ Ideation complete — ${ideasOut.length} ideas (${themeCount} themes × ${LENS_ORDER.length} lenses)`,
    ],
    ideas_detail,
  };
}
