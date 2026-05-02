/** Demo copy: example strategic approaches for the canonical collaboration theme. */
export const DEMO_COLLABORATION_DATA_LOSS_THEME = "Real-time collaboration data loss";

/** Present in the ideation `focus` string when collaboration three-approach rules apply. */
export const COLLABORATION_IDEATE_FOCUS_MARKER = "[DEMO:COLLABORATION_IDEATE_APPROACHES]";

export const DEMO_COLLABORATION_ROOT_PROBLEM =
  "simultaneous edits and sync conflicts that silently or destructively drop user content";

/** Three distinct angles on fixing the root cause (not three feature tickets). */
export const DEMO_COLLABORATION_IDEATE_APPROACHES: readonly string[] = [
  "Merge & consistency model — Move toward conflict-free or clearly resolved concurrent edits (CRDT-style or improved OT), so two people editing never produces a last-write-wins wipe of blocks; surface “true conflicts” only when semantics genuinely clash.",
  "Safety net before sync wins — Aggressive autosave, per-block version history, session checkpoints, and a “review merge” step before remote changes replace local state; default to preserving both sides until the user chooses.",
  "Trust, recovery, and enterprise proof — Observable sync health, admin-visible incident logs, granular restore (page / block / time), and export-before-sync for regulated teams so renewals aren’t blocked by “we can’t show what happened.”",
];

export function collaborationDataLossIdeatePromptAppendix(): string {
  const lines = DEMO_COLLABORATION_IDEATE_APPROACHES.map((a, i) => `${i + 1}. ${a}`);
  return [
    COLLABORATION_IDEATE_FOCUS_MARKER,
    "",
    "Use the following three example strategic approaches as minimum coverage (you may add stronger alternatives). Each major idea should tie back to addressing the root cause: " + DEMO_COLLABORATION_ROOT_PROBLEM + ".",
    "",
    ...lines,
    "",
    "Generate product ideas that materially advance at least one of these directions (or clearly better ones) across the lenses.",
  ].join("\n");
}

/** Seeds the ideate textarea; appends collaboration demo instructions only for that theme. */
export function buildFocusedIdeatePrompt(themeName: string, baseOneLiner: string): string {
  if (themeName !== DEMO_COLLABORATION_DATA_LOSS_THEME) return baseOneLiner.trim();
  return `${baseOneLiner.trim()}\n\n${collaborationDataLossIdeatePromptAppendix()}`;
}
