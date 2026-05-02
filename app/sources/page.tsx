"use client";

import { useState } from "react";
import { Search, Plus, CheckCircle2, ExternalLink, ChevronRight, Info } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type IntegrationStatus = "connected" | "available" | "coming_soon";
type Via = "merge" | "direct" | "mcp" | "scrape";

type Integration = {
  id: string;
  name: string;
  description: string;
  via: Via;
  status: IntegrationStatus;
  color: string;
  textColor: string;
  initial: string;
  lastSync?: string;
  docsUrl?: string;
  feedbackTypes: string[];
};

const CATEGORIES: { id: string; label: string; integrations: Integration[] }[] = [
  {
    id: "crm_revenue",
    label: "CRM & Revenue Intelligence",
    integrations: [
      {
        id: "salesforce",
        name: "Salesforce",
        description: "Pull support cases, NPS responses, and account-level feedback from Service Cloud and CRM notes.",
        via: "merge",
        status: "available",
        color: "bg-[#00A1E0]",
        textColor: "text-[#00A1E0]",
        initial: "S",
        feedbackTypes: ["Support cases", "Account notes", "Churn signals"],
      },
      {
        id: "hubspot",
        name: "HubSpot",
        description: "Ingest deal notes, contact activity, and support tickets from HubSpot CRM and Service Hub.",
        via: "merge",
        status: "available",
        color: "bg-[#FF7A59]",
        textColor: "text-[#FF7A59]",
        initial: "H",
        feedbackTypes: ["Deal notes", "Support tickets", "NPS"],
      },
      {
        id: "gong",
        name: "Gong",
        description: "Stream call transcripts, deal insights, and customer sentiment directly from Gong via their REST API.",
        via: "direct",
        status: "connected",
        lastSync: "2 min ago",
        color: "bg-[#6C5CE7]",
        textColor: "text-[#6C5CE7]",
        initial: "G",
        docsUrl: "https://us-east-1.api.gong.io/v2",
        feedbackTypes: ["Call transcripts", "Deal signals", "Objections"],
      },
      {
        id: "chorus",
        name: "Chorus / ZoomInfo",
        description: "Access conversation intelligence and buyer intent data from Chorus.ai via ZoomInfo's API.",
        via: "direct",
        status: "available",
        color: "bg-[#4A90D9]",
        textColor: "text-[#4A90D9]",
        initial: "C",
        feedbackTypes: ["Call recordings", "Buyer intent", "Competitor mentions"],
      },
    ],
  },
  {
    id: "support_ticketing",
    label: "Support & Ticketing",
    integrations: [
      {
        id: "zendesk",
        name: "Zendesk",
        description: "Sync support tickets, CSAT scores, and customer conversations at scale via Merge's unified ticketing API.",
        via: "merge",
        status: "connected",
        lastSync: "5 min ago",
        color: "bg-[#03363D]",
        textColor: "text-[#03363D]",
        initial: "Z",
        feedbackTypes: ["Support tickets", "CSAT", "Agent notes"],
      },
      {
        id: "intercom",
        name: "Intercom",
        description: "Pull conversation threads, in-app feedback, and product tour engagement via Merge's ticketing layer.",
        via: "merge",
        status: "available",
        color: "bg-[#286EFA]",
        textColor: "text-[#286EFA]",
        initial: "I",
        feedbackTypes: ["Conversations", "In-app feedback", "Feature requests"],
      },
      {
        id: "jira",
        name: "Jira",
        description: "Connect bug reports and customer-reported issues from Jira Service Management via Merge.",
        via: "merge",
        status: "available",
        color: "bg-[#0052CC]",
        textColor: "text-[#0052CC]",
        initial: "J",
        feedbackTypes: ["Bug reports", "Feature requests", "Customer issues"],
      },
      {
        id: "linear",
        name: "Linear",
        description: "Sync customer-reported issues and feature requests from Linear via Merge's ticketing API.",
        via: "merge",
        status: "available",
        color: "bg-[#5E6AD2]",
        textColor: "text-[#5E6AD2]",
        initial: "L",
        feedbackTypes: ["Issues", "Feature requests", "Bug reports"],
      },
      {
        id: "freshdesk",
        name: "Freshdesk",
        description: "Ingest customer tickets and satisfaction scores from Freshdesk via Merge's unified ticketing schema.",
        via: "merge",
        status: "available",
        color: "bg-[#25C16F]",
        textColor: "text-[#25C16F]",
        initial: "F",
        feedbackTypes: ["Tickets", "CSAT", "Resolution notes"],
      },
    ],
  },
  {
    id: "reviews",
    label: "Review Sites",
    integrations: [
      {
        id: "g2",
        name: "G2",
        description: "Pull verified B2B software reviews, competitive comparisons, and category rankings.",
        via: "scrape",
        status: "connected",
        lastSync: "1 hour ago",
        color: "bg-[#FF492C]",
        textColor: "text-[#FF492C]",
        initial: "G",
        feedbackTypes: ["Reviews", "Competitor data", "Category rankings"],
      },
      {
        id: "capterra",
        name: "Capterra",
        description: "Aggregate software reviews and ratings from Capterra's verified B2B user base.",
        via: "scrape",
        status: "available",
        color: "bg-[#FF6C37]",
        textColor: "text-[#FF6C37]",
        initial: "C",
        feedbackTypes: ["Reviews", "Ratings", "Pros & cons"],
      },
      {
        id: "appstore",
        name: "App Store / Play Store",
        description: "Monitor iOS and Android app reviews for mobile product feedback and rating trends.",
        via: "direct",
        status: "coming_soon",
        color: "bg-[#000000]",
        textColor: "text-gray-300",
        initial: "A",
        feedbackTypes: ["App reviews", "Ratings", "Version feedback"],
      },
    ],
  },
  {
    id: "social",
    label: "Social & Community",
    integrations: [
      {
        id: "reddit",
        name: "Reddit",
        description: "Search posts and comments across subreddits via Reddit's official API. Great for unfiltered product pain.",
        via: "direct",
        status: "connected",
        lastSync: "10 min ago",
        color: "bg-[#FF4500]",
        textColor: "text-[#FF4500]",
        initial: "R",
        docsUrl: "https://www.reddit.com/dev/api/",
        feedbackTypes: ["Posts", "Comments", "Upvote signals"],
      },
      {
        id: "x_twitter",
        name: "X / Twitter",
        description: "Search mentions and discussions via X API v2. Filter by keyword, handle, or sentiment to surface product signals.",
        via: "direct",
        status: "available",
        color: "bg-[#000000]",
        textColor: "text-gray-200",
        initial: "X",
        docsUrl: "https://developer.x.com/en/docs/x-api",
        feedbackTypes: ["Mentions", "Threads", "Sentiment"],
      },
      {
        id: "linkedin",
        name: "LinkedIn",
        description: "Monitor company page comments and posts via LinkedIn's Marketing API for B2B social signals.",
        via: "direct",
        status: "coming_soon",
        color: "bg-[#0A66C2]",
        textColor: "text-[#0A66C2]",
        initial: "Li",
        feedbackTypes: ["Comments", "Posts", "Company mentions"],
      },
    ],
  },
  {
    id: "surveys",
    label: "Surveys & Research",
    integrations: [
      {
        id: "typeform",
        name: "Typeform",
        description: "Stream survey responses in real-time via Typeform's webhooks and REST API.",
        via: "direct",
        status: "available",
        color: "bg-[#262627]",
        textColor: "text-gray-200",
        initial: "T",
        docsUrl: "https://developer.typeform.com/",
        feedbackTypes: ["Survey responses", "NPS", "Open-ended feedback"],
      },
      {
        id: "qualtrics",
        name: "Qualtrics",
        description: "Connect enterprise survey data and XM program results via Qualtrics' REST API.",
        via: "direct",
        status: "available",
        color: "bg-[#0076D6]",
        textColor: "text-[#0076D6]",
        initial: "Q",
        feedbackTypes: ["Survey responses", "NPS", "CX metrics"],
      },
      {
        id: "surveymonkey",
        name: "SurveyMonkey",
        description: "Pull survey results and response data from SurveyMonkey via their API.",
        via: "direct",
        status: "coming_soon",
        color: "bg-[#00BF6F]",
        textColor: "text-[#00BF6F]",
        initial: "SM",
        feedbackTypes: ["Survey responses", "NPS", "CSAT"],
      },
    ],
  },
];

const VIA_LABELS: Record<Via, { label: string; color: string; tooltip: string }> = {
  merge: {
    label: "via Merge.dev",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    tooltip: "Unified API — one OAuth flow covers all Merge-supported tools in this category",
  },
  direct: {
    label: "Direct API",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    tooltip: "Connects directly to the provider's REST API using an API key or OAuth",
  },
  mcp: {
    label: "MCP Server",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    tooltip: "Connected via a Claude MCP server",
  },
  scrape: {
    label: "Web crawler",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    tooltip: "Public review data collected via structured crawling (no official API available)",
  },
};

function StatusBadge({ status, lastSync }: { status: IntegrationStatus; lastSync?: string }) {
  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="text-[10px] text-emerald-400 font-medium">Connected</span>
        {lastSync && <span className="text-[10px] text-gray-600">· {lastSync}</span>}
      </div>
    );
  }
  if (status === "coming_soon") {
    return (
      <span className="text-[10px] text-gray-600 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
        Coming soon
      </span>
    );
  }
  return null;
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const via = VIA_LABELS[integration.via];
  const isConnected = integration.status === "connected";
  const isSoon = integration.status === "coming_soon";

  return (
    <div className={`group rounded-lg border bg-[#111113] p-4 flex flex-col gap-3 transition-colors ${
      isSoon
        ? "border-white/[0.04] opacity-50"
        : "border-white/[0.07] hover:border-white/[0.12]"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${integration.color} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
            {integration.initial}
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-none">{integration.name}</div>
            <div className="mt-1">
              <StatusBadge status={integration.status} lastSync={integration.lastSync} />
            </div>
          </div>
        </div>

        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${via.color} shrink-0`} title={via.tooltip}>
          {via.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-500 text-xs leading-relaxed flex-1">{integration.description}</p>

      {/* Feedback types */}
      <div className="flex gap-1 flex-wrap">
        {integration.feedbackTypes.map((t) => (
          <span key={t} className="text-[10px] text-gray-600 bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md">
            {t}
          </span>
        ))}
      </div>

      {/* Action */}
      <div className="flex items-center justify-between pt-0.5">
        {isConnected ? (
          <button className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors">
            <CheckCircle2 size={12} className="text-emerald-500" />
            Manage
          </button>
        ) : isSoon ? (
          <span className="text-[11px] text-gray-700">Not yet available</span>
        ) : (
          <button className="flex items-center gap-1.5 text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors">
            <Plus size={12} />
            Connect
            <ChevronRight size={11} />
          </button>
        )}

        {integration.docsUrl && (
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-700 hover:text-gray-500 flex items-center gap-0.5 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Docs <ExternalLink size={9} />
          </a>
        )}
      </div>
    </div>
  );
}

export default function SourcesPage() {
  const [search, setSearch] = useState("");

  const connectedCount = CATEGORIES.flatMap((c) => c.integrations).filter((i) => i.status === "connected").length;
  const totalCount = CATEGORIES.flatMap((c) => c.integrations).length;

  const filteredCategories = CATEGORIES.map((cat) => ({
    ...cat,
    integrations: search
      ? cat.integrations.filter(
          (i) =>
            i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.description.toLowerCase().includes(search.toLowerCase()) ||
            i.feedbackTypes.some((t) => t.toLowerCase().includes(search.toLowerCase()))
        )
      : cat.integrations,
  })).filter((cat) => cat.integrations.length > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-[#090909]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-sm">
          <div>
            <h1 className="text-sm font-semibold text-white">Sources</h1>
            <p className="text-[11px] text-gray-500 leading-none mt-0.5">
              {connectedCount} of {totalCount} connected
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-md pl-7 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 w-52 transition-colors"
              />
            </div>

            {/* Merge info chip */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/20">
              <span className="text-[10px] font-semibold text-violet-400">Merge.dev</span>
              <Info size={10} className="text-violet-500/60" />
              <span className="text-[10px] text-violet-500/60">Unified API</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-8">
          {/* Merge.dev callout */}
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.04] px-4 py-3 flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Zap size={12} className="text-violet-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-violet-300 mb-0.5">Merge.dev — one OAuth, every CRM and ticketing tool</div>
              <p className="text-[11px] text-violet-400/60 leading-relaxed">
                Connect once via Merge and ingest from Salesforce, HubSpot, Zendesk, Intercom, Jira, Linear, and more through a single normalized API.
                No per-tool auth flows, no schema mapping. Direct and MCP integrations run alongside Merge for sources outside its catalog.
              </p>
            </div>
          </div>

          {filteredCategories.map((cat) => (
            <section key={cat.id}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{cat.label}</h2>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {cat.integrations.map((integration) => (
                  <IntegrationCard key={integration.id} integration={integration} />
                ))}
              </div>
            </section>
          ))}

          {filteredCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-gray-600 text-sm">No integrations match &ldquo;{search}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Zap({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
