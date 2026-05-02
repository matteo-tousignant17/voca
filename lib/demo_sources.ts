import type { ToolResultDetail } from "./agent";

export type DemoSource = {
  id: string;
  label: string;
  short_label: string;
  count: number;
  tool_name: string;
  trace_color: string;
  badge_bg: string;
  badge_text: string;
  initial: string;
  initial_bg: string;
  description: string;
  fetch_summary: string;
  fetch_details: ToolResultDetail;
};

export const DEMO_SOURCES: DemoSource[] = [
  {
    id: "salesforce",
    label: "Salesforce sales notes",
    short_label: "Salesforce",
    count: 47,
    tool_name: "fetch_salesforce_notes",
    trace_color: "text-sky-400",
    badge_bg: "bg-sky-500/10 border-sky-500/20",
    badge_text: "text-sky-300",
    initial: "S",
    initial_bg: "bg-[#00A1E0]",
    description: "Opportunity & account notes, churn-risk flags",
    fetch_summary:
      "Fetched 47 Salesforce notes — 12 churn-risk, 18 expansion, 17 renewal — across $4.2M ARR",
    fetch_details: {
      kind: "table",
      columns: ["Account", "Stage", "ARR", "Note excerpt"],
      rows: [
        [
          "Lattice Robotics",
          "Renewal at risk",
          "$320K",
          "Exec team raising data-loss + AI context concerns; CFO involved",
        ],
        [
          "Helix Biosciences",
          "Renewal at risk",
          "$168K",
          "SOC2 audit log gap + EU residency, 60-day window",
        ],
        [
          "Heritage Wealth",
          "Expansion blocked",
          "$112K",
          "300-seat upgrade pending audit log immutability",
        ],
        [
          "Meridian Capital",
          "Renewal at risk",
          "$96K",
          "SSO reliability + audit log; multi-year deal contingent",
        ],
        [
          "Northwind Logistics",
          "Expansion blocked",
          "$88K",
          "200-seat field rollout blocked by offline + API limits",
        ],
        [
          "Bramble Health",
          "Churn risk",
          "$36K",
          "AI add-on cancel intent at renewal; Glean evaluation underway",
        ],
        [
          "Crestline Partners",
          "Active escalation",
          "$31K",
          "12-day P1 on Salesforce sync, support escalation in flight",
        ],
      ],
    },
  },
  {
    id: "zendesk",
    label: "Zendesk tickets",
    short_label: "Zendesk",
    count: 132,
    tool_name: "fetch_zendesk_tickets",
    trace_color: "text-emerald-300",
    badge_bg: "bg-emerald-500/10 border-emerald-500/20",
    badge_text: "text-emerald-300",
    initial: "Z",
    initial_bg: "bg-[#03363D]",
    description: "Support tickets, CSAT, SLA breaches",
    fetch_summary:
      "Fetched 132 Zendesk tickets — CSAT 3.4/5 (-0.6 vs 90d) · 28 P1, 7 SLA breaches",
    fetch_details: {
      kind: "table",
      columns: ["Priority", "Subject", "Tier", "CSAT"],
      rows: [
        ["P1", "Real-time edits dropping content (Velocity Agency)", "Mid-Market", "1/5"],
        ["P1", "SSO 401 loops on Okta — 230 users locked out", "Enterprise", "—"],
        ["P1", "Salesforce 2-way sync stuck for 12 days", "Mid-Market", "2/5"],
        ["P2", "Audit log missing edit attribution for compliance", "Enterprise", "2/5"],
        ["P2", "Mobile app launch >8s on iOS, blocking field reps", "Mid-Market", "3/5"],
        ["P2", "Search returns no results for known docs (8K pages)", "Enterprise", "2/5"],
        ["P3", "Renewal billed 40% over expectation, no notice", "Mid-Market", "1/5"],
      ],
    },
  },
  {
    id: "gong",
    label: "Gong call transcripts",
    short_label: "Gong",
    count: 14,
    tool_name: "fetch_gong_transcripts",
    trace_color: "text-violet-300",
    badge_bg: "bg-violet-500/10 border-violet-500/20",
    badge_text: "text-violet-300",
    initial: "G",
    initial_bg: "bg-[#6C5CE7]",
    description: "Renewal-risk & churn-save call transcripts",
    fetch_summary:
      "Fetched 14 Gong calls (8 renewal-risk, 4 churn-save, 2 expansion) — avg sentiment -31",
    fetch_details: {
      kind: "quotes",
      items: [
        {
          quote:
            "Our compliance team did a review and Notion can't tell us clearly who edited what and when. That's a blocker for our regulatory requirements.",
          source: "Meridian Capital · renewal_risk · 38m",
          tier: "Enterprise · $96K",
        },
        {
          quote:
            "Our lead designer spent two days on a client presentation, and a simultaneous editing conflict wiped out about 30% of it.",
          source: "Velocity Agency · churn_save · 52m",
          tier: "Mid-Market · $18K",
        },
        {
          quote:
            "If you had offline mode, I could get you 80 more seats today. That's an easy decision.",
          source: "Brightpath Education · expansion_blocked · 29m",
          tier: "Mid-Market · $24K",
        },
      ],
    },
  },
  {
    id: "g2",
    label: "G2 reviews",
    short_label: "G2",
    count: 25,
    tool_name: "fetch_g2_reviews",
    trace_color: "text-rose-300",
    badge_bg: "bg-rose-500/10 border-rose-500/20",
    badge_text: "text-rose-300",
    initial: "G",
    initial_bg: "bg-[#FF492C]",
    description: "Verified B2B reviews, last 90 days",
    fetch_summary:
      "Fetched 25 G2 reviews — avg 3.4★ (-0.4 QoQ), 8 reviews ≤2★ tagged data-loss / governance",
    fetch_details: {
      kind: "table",
      columns: ["Stars", "Reviewer", "Headline"],
      rows: [
        ["1★", "CISO · Healthcare", "Cannot recommend for regulated industries"],
        ["1★", "General Counsel · Legal", "Lost critical data — switching to Confluence"],
        ["2★", "Head of Ops · Software", "Great concept, terrible performance at scale"],
        ["2★", "Eng Manager · Software", "Real-time collaboration caused us actual data loss"],
        ["2★", "VP Eng · Tech", "Pricing increased 40% with no notice — unacceptable"],
        ["3★", "PM · SaaS", "Search is still my #1 frustration after 2 years"],
        ["4★", "Director PM · Consulting", "Best all-in-one but offline support is a must-have"],
        ["5★", "Founder · Marketing", "Cannot imagine running our 8-person agency without it"],
      ],
    },
  },
  {
    id: "reddit",
    label: "Reddit (r/Notion)",
    short_label: "Reddit",
    count: 35,
    tool_name: "fetch_reddit_posts",
    trace_color: "text-orange-300",
    badge_bg: "bg-orange-500/10 border-orange-500/20",
    badge_text: "text-orange-300",
    initial: "R",
    initial_bg: "bg-[#FF4500]",
    description: "Posts & top comments, last 60 days",
    fetch_summary:
      "Fetched 35 Reddit posts — 4,128 total upvotes · top complaint clusters: API perf, offline, permissions",
    fetch_details: {
      kind: "table",
      columns: ["Upvotes", "Title", "Author tier"],
      rows: [
        ["1,203", "Offline mode is a dealbreaker for our team", "SMB consultant"],
        ["847", "Why is the API still so slow in 2024?", "Startup developer"],
        ["789", "Please add proper version history / audit log for enterprise", "Enterprise compliance"],
        ["654", "Permission system is way too complicated for non-technical members", "SMB manager"],
        ["432", "Enterprise SSO has been broken for 2 weeks", "Enterprise IT admin"],
        ["298", "Notion AI doesn't actually use my workspace", "Mid-Market PM"],
      ],
    },
  },
  {
    id: "amplitude",
    label: "Amplitude product analytics",
    short_label: "Amplitude",
    count: 6,
    tool_name: "fetch_amplitude_signals",
    trace_color: "text-indigo-300",
    badge_bg: "bg-indigo-500/10 border-indigo-500/20",
    badge_text: "text-indigo-300",
    initial: "A",
    initial_bg: "bg-[#1E61F0]",
    description: "Behavioral funnels & feature drop-offs",
    fetch_summary:
      "Pulled 6 funnel & retention cohorts — mobile session length down 22% QoQ · search abandon 41%",
    fetch_details: {
      kind: "table",
      columns: ["Funnel / Cohort", "Metric", "Trend"],
      rows: [
        ["Search → result click", "59% complete", "-14pp QoQ"],
        ["Search abandons (>3K pages)", "41%", "+11pp QoQ"],
        ["iOS app session length", "2m 18s avg", "-22% QoQ"],
        ["AI prompt → accepted answer", "31% complete", "-9pp QoQ"],
        ["Real-time multi-editor save", "0.7% conflict rate", "+0.3pp QoQ"],
        ["Enterprise admin · audit log view", "12% MAU", "flat"],
      ],
    },
  },
  {
    id: "pendo",
    label: "Pendo in-app NPS & guides",
    short_label: "Pendo",
    count: 4,
    tool_name: "fetch_pendo_signals",
    trace_color: "text-amber-300",
    badge_bg: "bg-amber-500/10 border-amber-500/20",
    badge_text: "text-amber-300",
    initial: "P",
    initial_bg: "bg-[#FF4F00]",
    description: "In-app NPS responses & guide engagement",
    fetch_summary:
      "Pulled 4 Pendo segments — NPS 6 overall (-4 QoQ) · top detractor reasons: search, mobile, pricing",
    fetch_details: {
      kind: "table",
      columns: ["Segment", "NPS", "Top detractor reason"],
      rows: [
        ["SMB", "-4", "Mobile + offline + guest pricing"],
        ["Mid-Market", "8", "Search at scale + real-time stability"],
        ["Enterprise", "14", "Audit log + SSO reliability"],
        ["AI add-on subscribers", "1", "AI lacks workspace context"],
      ],
    },
  },
];

export const DEMO_SOURCE_BY_ID: Record<string, DemoSource> = Object.fromEntries(
  DEMO_SOURCES.map((s) => [s.id, s]),
);

// Total counts
export const DEMO_TOTAL_ITEMS = DEMO_SOURCES.reduce((s, d) => s + d.count, 0);
