import { NextRequest } from "next/server";
import { runVoCAgent } from "@/lib/agent";
import { runDemoAgent } from "@/lib/demo_agent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sources: string[] = body.sources ?? ["reddit", "g2", "gong", "support_tickets"];
  const focus: string = body.focus ?? "general";
  const mode: "live" | "demo" = body.mode === "demo" ? "demo" : "live";

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
