/**
 * AgentsA Voice Call Integration Service
 *
 * Handles voice call dispatching and webhook processing for attendance confirmation.
 * API Base URL: https://velents-agents.velents.ai
 * Channel ID: 3 (Voice)
 */

import { db } from "@/server/db";
import { toSaudiTime } from "./timezone";

// =============================================================================
// CONFIGURATION
// =============================================================================

const AGENTSA_BASE_URL =
  process.env.AGENTSA_BASE_URL ?? "https://velents-agents.velents.ai";
const AGENTSA_API_KEY = process.env.AGENTSA_API_KEY ?? "";
const AGENTSA_WEBHOOK_SECRET = process.env.AGENTSA_WEBHOOK_SECRET ?? "";
const VOICE_CHANNEL_ID = 3;

// =============================================================================
// TYPES
// =============================================================================

export interface AgentsAWebhookPayload {
  event: {
    type: string; // "ondone"
    about: string; // "call"
  };
  agent: {
    id: number;
    public: string;
  };
  call: {
    id: number;
    channel_id: number;
    phone: string;
    values: Record<string, unknown>;
    created_at: string;
  };
  result: {
    recording?: string;
    call_recording_url?: string;
    history?: Array<{
      role: "assistant" | "user";
      content: string;
      timeAdded: string;
    }>;
    goals?: {
      is_joining?: boolean;
    };
  };
}

export interface CallStatistics {
  total: number;
  pending: number;
  initiated: number;
  completed: number;
  failed: number;
  confirmed: number;
  declined: number;
  noResponse: number;
  confirmationRate: number;
}

interface DispatchPayload {
  channel_id: number;
  phone: string;
  values: Record<string, unknown>;
  webhook: {
    link: string;
    body: Record<string, unknown>;
    headers: Record<string, string>;
  };
}

interface BatchDispatchPayload {
  channel_id: number;
  name: string;
  rows: Array<{
    phone: string;
    values: Record<string, unknown>;
  }>;
  webhook: {
    link: string;
    body: Record<string, unknown>;
    headers: Record<string, string>;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${AGENTSA_API_KEY}`,
    "Content-Type": "application/json",
  };
}

function buildWebhookConfig(callId?: string): DispatchPayload["webhook"] {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  return {
    link: `${baseUrl}/api/webhooks/agentsa`,
    body: callId ? { call_id: callId } : {},
    headers: {},  // AgentsA sends x-velents-authorization header automatically
  };
}

async function logCallEvent(
  voiceCallId: string,
  eventType: string,
  eventData?: Record<string, unknown>
): Promise<void> {
  try {
    await db.voiceCallLog.create({
      data: {
        voiceCallId,
        eventType,
        eventData: eventData ? JSON.parse(JSON.stringify(eventData)) : undefined,
      },
    });
    console.log(`[VoiceCall] ${voiceCallId}: ${eventType}`);
  } catch (error) {
    console.error(`[VoiceCall] Failed to log event:`, error);
  }
}

function mapIsJoiningToResponse(
  isJoining: boolean | undefined | null
): string | null {
  if (isJoining === true) return "confirmed";
  if (isJoining === false) return "declined";
  return null; // no_response will be set later if needed
}

async function updateBatchStats(batchId: string): Promise<void> {
  try {
    const calls = await db.voiceCall.findMany({
      where: { batchId },
      select: { status: true, confirmationResponse: true },
    });

    const completedCalls = calls.filter((c) => c.status === "completed").length;
    const confirmedCount = calls.filter(
      (c) => c.confirmationResponse === "confirmed"
    ).length;
    const declinedCount = calls.filter(
      (c) => c.confirmationResponse === "declined"
    ).length;
    const noResponseCount = calls.filter(
      (c) => c.confirmationResponse === "no_response"
    ).length;

    const batch = await db.voiceCallBatch.findUnique({
      where: { id: batchId },
      select: { totalCalls: true },
    });

    const isCompleted = batch && completedCalls >= batch.totalCalls;

    await db.voiceCallBatch.update({
      where: { id: batchId },
      data: {
        completedCalls,
        confirmedCount,
        declinedCount,
        noResponseCount,
        status: isCompleted ? "completed" : "in_progress",
        completedAt: isCompleted ? new Date() : undefined,
      },
    });
  } catch (error) {
    console.error(`[VoiceCall] Failed to update batch stats:`, error);
  }
}

function formatSessionDate(date: Date): string {
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";
  return saudiDate.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    numberingSystem: "latn",
  });
}

function formatSessionTime(date: Date): string {
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";
  return saudiDate.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  });
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Dispatch a single voice call for attendance confirmation
 */
export async function dispatchSingleCall(
  registrationId: string,
  sessionId: string
): Promise<{ success: boolean; callId?: string; error?: string }> {
  if (!AGENTSA_API_KEY) {
    console.warn("[VoiceCall] AGENTSA_API_KEY not configured");
    return { success: false, error: "AGENTSA_API_KEY not configured" };
  }

  try {
    // Get registration details
    const registration = await db.registration.findUnique({
      where: { id: registrationId },
      include: { user: true, session: true },
    });

    if (!registration) {
      console.error(`[VoiceCall] Registration ${registrationId} not found`);
      return { success: false, error: "Registration not found" };
    }

    // Get phone number (user or guest)
    const phone = registration.user?.phone ?? registration.guestPhone;
    const name =
      registration.user?.name ?? registration.guestName ?? "المشارك";

    if (!phone) {
      console.error(
        `[VoiceCall] No phone number for registration ${registrationId}`
      );
      return { success: false, error: "No phone number" };
    }

    const session = registration.session;

    // Create voice call record first to get ID
    const voiceCall = await db.voiceCall.create({
      data: {
        registrationId,
        sessionId,
        phoneNumber: phone,
        recipientName: name,
        status: "pending",
      },
    });

    // Build request payload
    const payload: DispatchPayload = {
      channel_id: VOICE_CHANNEL_ID,
      phone,
      values: {
        call_id: voiceCall.id,
        recipient_name: name,
        session_title: session.title,
        session_date: formatSessionDate(session.date),
        session_time: formatSessionTime(session.date),
        session_location: session.location ?? "سيتم الإعلان عنه",
      },
      webhook: buildWebhookConfig(voiceCall.id),
    };

    console.log(`[VoiceCall] Dispatching to ${phone} for session ${sessionId}`);
    await logCallEvent(voiceCall.id, "dispatch", { payload });

    // Make API request
    const response = await fetch(
      `${AGENTSA_BASE_URL}/Integration/Agent/Dispatch`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      const responseData = (await response.json()) as Record<string, unknown>;

      await db.voiceCall.update({
        where: { id: voiceCall.id },
        data: {
          status: "initiated",
          initiatedAt: new Date(),
        },
      });

      console.log(`[VoiceCall] Call ${voiceCall.id} dispatched successfully`);
      await logCallEvent(voiceCall.id, "initiated", { response: responseData });

      return { success: true, callId: voiceCall.id };
    } else {
      const errorText = await response.text();
      const errorMsg = `AgentsA API error: ${response.status} - ${errorText}`;

      await db.voiceCall.update({
        where: { id: voiceCall.id },
        data: {
          status: "failed",
          lastError: errorMsg,
        },
      });

      console.error(`[VoiceCall] ${errorMsg}`);
      await logCallEvent(voiceCall.id, "error", { error: errorMsg });

      return { success: false, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[VoiceCall] Dispatch failed:`, error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Dispatch batch voice calls for multiple registrations
 */
export async function dispatchBatchCalls(
  sessionId: string,
  registrationIds: string[],
  adminId: string
): Promise<{ success: boolean; batchId?: string; totalCalls?: number; error?: string }> {
  if (!AGENTSA_API_KEY) {
    console.warn("[VoiceCall] AGENTSA_API_KEY not configured");
    return { success: false, error: "AGENTSA_API_KEY not configured" };
  }

  if (!registrationIds.length) {
    console.warn("[VoiceCall] No registration IDs provided for batch");
    return { success: false, error: "No registrations provided" };
  }

  try {
    const session = await db.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      console.error(`[VoiceCall] Session ${sessionId} not found`);
      return { success: false, error: "Session not found" };
    }

    // Create batch record
    const batchName = `session_${sessionId}_${Date.now()}`;
    const batch = await db.voiceCallBatch.create({
      data: {
        sessionId,
        name: batchName,
        status: "pending",
        totalCalls: registrationIds.length,
        triggeredByAdminId: adminId,
      },
    });

    // Build rows for batch API
    const rows: BatchDispatchPayload["rows"] = [];
    const voiceCallIds: string[] = [];

    for (const regId of registrationIds) {
      const registration = await db.registration.findUnique({
        where: { id: regId },
        include: { user: true },
      });

      if (!registration) continue;

      const phone = registration.user?.phone ?? registration.guestPhone;
      const name =
        registration.user?.name ?? registration.guestName ?? "المشارك";

      if (!phone) continue;

      // Create individual call record
      const voiceCall = await db.voiceCall.create({
        data: {
          registrationId: regId,
          sessionId,
          batchId: batch.id,
          phoneNumber: phone,
          recipientName: name,
          status: "pending",
        },
      });

      voiceCallIds.push(voiceCall.id);

      rows.push({
        phone,
        values: {
          call_id: voiceCall.id,
          recipient_name: name,
          session_title: session.title,
          session_date: formatSessionDate(session.date),
          session_time: formatSessionTime(session.date),
          session_location: session.location ?? "سيتم الإعلان عنه",
        },
      });
    }

    if (!rows.length) {
      console.warn("[VoiceCall] No valid phone numbers found for batch");
      await db.voiceCallBatch.delete({ where: { id: batch.id } });
      return { success: false, error: "No valid phone numbers" };
    }

    // Update actual total
    await db.voiceCallBatch.update({
      where: { id: batch.id },
      data: { totalCalls: rows.length },
    });

    // Build batch request payload
    const payload: BatchDispatchPayload = {
      channel_id: VOICE_CHANNEL_ID,
      name: batchName,
      rows,
      webhook: buildWebhookConfig(),
    };

    console.log(
      `[VoiceCall] Dispatching batch ${batch.id} with ${rows.length} calls`
    );

    // Make API request
    const response = await fetch(
      `${AGENTSA_BASE_URL}/Integration/Agent/Batch`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      await db.voiceCallBatch.update({
        where: { id: batch.id },
        data: {
          status: "dispatching",
          dispatchedAt: new Date(),
        },
      });

      // Update all calls to initiated
      for (const callId of voiceCallIds) {
        await db.voiceCall.update({
          where: { id: callId },
          data: {
            status: "initiated",
            initiatedAt: new Date(),
          },
        });
        await logCallEvent(callId, "initiated", { batchId: batch.id });
      }

      console.log(`[VoiceCall] Batch ${batch.id} dispatched successfully`);
      return { success: true, batchId: batch.id, totalCalls: rows.length };
    } else {
      const errorText = await response.text();
      const errorMsg = `AgentsA Batch API error: ${response.status} - ${errorText}`;

      await db.voiceCallBatch.update({
        where: { id: batch.id },
        data: { status: "failed" },
      });

      for (const callId of voiceCallIds) {
        await db.voiceCall.update({
          where: { id: callId },
          data: {
            status: "failed",
            lastError: errorMsg,
          },
        });
        await logCallEvent(callId, "error", { error: errorMsg });
      }

      console.error(`[VoiceCall] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[VoiceCall] Batch dispatch failed:`, error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Process incoming webhook event from AgentsA
 */
export async function processWebhook(
  payload: AgentsAWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract call_id from the values we sent
    const callId = payload.call?.values?.call_id as string | undefined;

    if (!callId) {
      console.warn("[VoiceCall] Webhook received without call_id");
      return { success: false, error: "No call_id in webhook" };
    }

    const voiceCall = await db.voiceCall.findUnique({
      where: { id: callId },
    });

    if (!voiceCall) {
      console.warn(`[VoiceCall] VoiceCall ${callId} not found for webhook`);
      return { success: false, error: "VoiceCall not found" };
    }

    // Log the webhook event
    await logCallEvent(callId, "webhook_received", payload as unknown as Record<string, unknown>);

    const eventType = payload.event?.type;

    if (eventType === "ondone") {
      // Call completed - process results
      const isJoining = payload.result?.goals?.is_joining;
      const confirmationResponse = mapIsJoiningToResponse(isJoining);
      const recordingUrl =
        payload.result?.recording ?? payload.result?.call_recording_url;
      const conversationHistory = payload.result?.history;

      await db.voiceCall.update({
        where: { id: callId },
        data: {
          status: "completed",
          completedAt: new Date(),
          agentsaCallId: payload.call?.id,
          confirmationResponse,
          recordingUrl,
          conversationHistory: conversationHistory ?? undefined,
        },
      });

      // Update batch stats if applicable
      if (voiceCall.batchId) {
        await updateBatchStats(voiceCall.batchId);
      }

      console.log(
        `[VoiceCall] Call ${callId}: ${confirmationResponse ?? "no_response"}, recording saved`
      );
      await logCallEvent(callId, "completed", {
        confirmationResponse,
        hasRecording: !!recordingUrl,
      });

      return { success: true };
    }

    // For other event types, just log them
    console.log(`[VoiceCall] Webhook event: ${eventType} for call ${callId}`);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[VoiceCall] Webhook processing failed:`, error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Verify webhook signature using the x-velents-authorization header
 */
export function verifyWebhookSignature(
  authorization: string | null
): boolean {
  if (!AGENTSA_WEBHOOK_SECRET) {
    // Skip verification if not configured
    console.warn("[VoiceCall] AGENTSA_WEBHOOK_SECRET not configured - skipping verification");
    return true;
  }
  if (!authorization) {
    console.warn("[VoiceCall] Missing x-velents-authorization header");
    return false;
  }
  return authorization === AGENTSA_WEBHOOK_SECRET;
}

/**
 * Retry a failed voice call
 */
export async function retryFailedCall(
  voiceCallId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const voiceCall = await db.voiceCall.findUnique({
      where: { id: voiceCallId },
    });

    if (!voiceCall) {
      return { success: false, error: "VoiceCall not found" };
    }

    if (voiceCall.retryCount >= voiceCall.maxRetries) {
      console.warn(`[VoiceCall] Call ${voiceCallId}: max retries exceeded`);
      return { success: false, error: "Max retries exceeded" };
    }

    if (!["failed"].includes(voiceCall.status)) {
      console.warn(
        `[VoiceCall] Call ${voiceCallId}: cannot retry - status is ${voiceCall.status}`
      );
      return { success: false, error: `Cannot retry - status is ${voiceCall.status}` };
    }

    // Increment retry count
    await db.voiceCall.update({
      where: { id: voiceCallId },
      data: {
        retryCount: { increment: 1 },
        status: "pending",
        lastError: null,
      },
    });

    await logCallEvent(voiceCallId, "retry", {
      attempt: voiceCall.retryCount + 1,
    });

    console.warn(
      `[VoiceCall] Call ${voiceCallId}: retry attempt ${voiceCall.retryCount + 1} of ${voiceCall.maxRetries}`
    );

    // Dispatch again
    const result = await dispatchSingleCall(
      voiceCall.registrationId,
      voiceCall.sessionId
    );

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[VoiceCall] Retry failed:`, error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Get voice call statistics for a session
 */
export async function getCallStatistics(
  sessionId: string
): Promise<CallStatistics> {
  const calls = await db.voiceCall.findMany({
    where: { sessionId },
    select: { status: true, confirmationResponse: true },
  });

  const total = calls.length;
  const pending = calls.filter((c) => c.status === "pending").length;
  const initiated = calls.filter((c) => c.status === "initiated").length;
  const completed = calls.filter((c) => c.status === "completed").length;
  const failed = calls.filter((c) => c.status === "failed").length;
  const confirmed = calls.filter(
    (c) => c.confirmationResponse === "confirmed"
  ).length;
  const declined = calls.filter(
    (c) => c.confirmationResponse === "declined"
  ).length;
  const noResponse = calls.filter(
    (c) => c.confirmationResponse === "no_response"
  ).length;

  const confirmationRate = total > 0 ? (confirmed / total) * 100 : 0;

  return {
    total,
    pending,
    initiated,
    completed,
    failed,
    confirmed,
    declined,
    noResponse,
    confirmationRate,
  };
}
