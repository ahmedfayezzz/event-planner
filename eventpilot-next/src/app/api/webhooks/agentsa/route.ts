import { NextResponse } from "next/server";
import {
  processWebhook,
  verifyWebhookSignature,
  type AgentsAWebhookPayload,
} from "@/lib/agentsa";

export async function POST(request: Request) {
  try {
    // Verify webhook signature using x-velents-authorization header
    const authorization = request.headers.get("x-velents-authorization");
    if (!verifyWebhookSignature(authorization)) {
      console.warn("[VoiceCall Webhook] Invalid or missing x-velents-authorization");
      return NextResponse.json({ error: "Invalid authorization" }, { status: 403 });
    }

    // Parse payload
    const payload = (await request.json()) as AgentsAWebhookPayload;

    console.log(
      `[VoiceCall Webhook] Received: ${payload.event?.type} for call ${payload.call?.values?.call_id}`
    );

    // Process the webhook
    const result = await processWebhook(payload);

    if (result.success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      console.error(`[VoiceCall Webhook] Processing failed: ${result.error}`);
      return NextResponse.json(
        { error: result.error ?? "Processing failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[VoiceCall Webhook] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({ status: "ok", service: "agentsa-webhook" });
}
