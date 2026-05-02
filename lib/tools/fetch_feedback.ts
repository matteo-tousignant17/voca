import redditPosts from "@/data/reddit_posts.json";
import g2Reviews from "@/data/g2_reviews.json";
import gongTranscripts from "@/data/gong_transcripts.json";
import supportTickets from "@/data/support_tickets.json";

export type FeedbackItem = {
  id: string;
  source: string;
  text: string;
  author_type?: string;
  company_size?: string;
  account_tier?: string;
  arr?: number;
  date: string;
  sentiment_hint?: string;
  upvotes?: number;
};

export function fetchFeedbackSources(sources: string[]): FeedbackItem[] {
  const items: FeedbackItem[] = [];

  if (sources.includes("reddit")) {
    for (const post of redditPosts) {
      items.push({
        id: post.id,
        source: "Reddit (r/Notion)",
        text: `${post.title}: ${post.body}`,
        author_type: post.author_type,
        company_size: post.company_size,
        date: post.date,
        upvotes: post.upvotes,
      });
    }
  }

  if (sources.includes("g2")) {
    for (const review of g2Reviews) {
      items.push({
        id: review.id,
        source: "G2 Review",
        text: `[${review.rating}/5] ${review.title}: Pros: ${review.pros}. Cons: ${review.cons}`,
        author_type: review.reviewer_role,
        company_size: review.company_size,
        date: review.date,
        sentiment_hint: review.rating <= 2 ? "negative" : review.rating >= 4 ? "positive" : "mixed",
      });
    }
  }

  if (sources.includes("gong")) {
    for (const call of gongTranscripts) {
      const quotes = call.excerpts.map((e) => `"${e.quote}"`).join(" | ");
      items.push({
        id: call.id,
        source: `Gong Call (${call.call_type.replace(/_/g, " ")})`,
        text: `${call.account_name} — ${call.call_type}: ${quotes}`,
        account_tier: call.account_tier,
        arr: call.arr,
        date: call.date,
        sentiment_hint: call.sentiment,
      });
    }
  }

  if (sources.includes("support_tickets")) {
    for (const ticket of supportTickets) {
      items.push({
        id: ticket.id,
        source: "Support Ticket",
        text: `[${ticket.priority.toUpperCase()}] ${ticket.subject}: ${ticket.body}`,
        account_tier: ticket.account_tier,
        arr: ticket.arr,
        date: ticket.date,
        sentiment_hint: ticket.priority === "urgent" ? "very_negative" : "negative",
      });
    }
  }

  return items;
}
