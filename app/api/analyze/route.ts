import { NextRequest } from "next/server";
import { runVoCAgent } from "@/lib/agent";
import { runDemoAgent } from "@/lib/demo_agent";
import { DEMO_SOURCES } from "@/lib/demo_sources";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEMO_DEFAULT_SOURCES = DEMO_SOURCES.map((s) => s.id);
const LIVE_DEFAULT_SOURCES = ["reddit", "g2", "gong", "support_tickets"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const focus: string = body.focus ?? "general";
  const mode: "live" | "demo" = body.mode === "live" ? "live" : "demo";

  const requested = Array.isArray(body.sources) ? (body.sources as string[]) : null;
  // In demo mode always use the full demo source catalog so the scripted agent
  // shows all 7 parallel tool calls and orchestration steps. The home page
  // selectedSources contains live-mode IDs which would otherwise filter down
  // to a partial subset and break the demo narrative.
  const sources = mode === "demo"
    ? DEMO_DEFAULT_SOURCES
    : (requested ?? LIVE_DEFAULT_SOURCES);

  const encoder = new TextEncoder();
  const generator = mode === "demo" ? runDemoAgent(sources, focus) : runVoCAgent(sources, focus);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (err) {
        const errEvent = { type: "error", message: String(err) };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errEvent)}\n\n`));
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
