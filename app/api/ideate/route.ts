import { NextRequest } from "next/server";
import { runIdeateAgent } from "@/lib/ideate";
import { runDemoIdeateAgent } from "@/lib/demo_ideate";
import type { BriefItem } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const themes: BriefItem[] = body.themes ?? [];
  const focus: string | undefined = typeof body.focus === "string" ? body.focus : undefined;
  const mode: "live" | "demo" = body.mode === "live" ? "live" : "demo";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const gen = mode === "demo" ? runDemoIdeateAgent(themes, focus) : runIdeateAgent(themes, focus);
        for await (const event of gen) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
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
