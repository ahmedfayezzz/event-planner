import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../trpc";
import {
  dispatchSingleCall,
  dispatchBatchCalls,
  retryFailedCall,
  getCallStatistics,
} from "@/lib/agentsa";

export const voiceCallRouter = createTRPCRouter({
  /**
   * Get voice calls for a session
   */
  getBySession: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const calls = await ctx.db.voiceCall.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: "desc" },
        include: {
          registration: {
            include: {
              user: {
                select: { name: true, phone: true, email: true },
              },
            },
          },
        },
      });

      return calls.map((call) => ({
        id: call.id,
        phoneNumber: call.phoneNumber,
        recipientName: call.recipientName,
        status: call.status,
        confirmationResponse: call.confirmationResponse,
        recordingUrl: call.recordingUrl,
        conversationHistory: call.conversationHistory as Array<{
          role: string;
          content: string;
          timeAdded?: string;
        }> | null,
        retryCount: call.retryCount,
        maxRetries: call.maxRetries,
        lastError: call.lastError,
        createdAt: call.createdAt,
        initiatedAt: call.initiatedAt,
        completedAt: call.completedAt,
        registrationId: call.registrationId,
        batchId: call.batchId,
      }));
    }),

  /**
   * Get voice call statistics for a session
   */
  getStatistics: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return getCallStatistics(input.sessionId);
    }),

  /**
   * Dispatch a single voice call
   */
  dispatchSingle: adminProcedure
    .input(
      z.object({
        registrationId: z.string(),
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await dispatchSingleCall(
        input.registrationId,
        input.sessionId
      );

      if (result.success) {
        return {
          success: true,
          callId: result.callId,
          message: "تم إرسال المكالمة بنجاح",
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.error ?? "فشل في إرسال المكالمة",
        };
      }
    }),

  /**
   * Dispatch batch voice calls
   */
  dispatchBatch: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        registrationIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const adminId = ctx.session.user.id;

      const result = await dispatchBatchCalls(
        input.sessionId,
        input.registrationIds,
        adminId
      );

      if (result.success) {
        return {
          success: true,
          batchId: result.batchId,
          totalCalls: result.totalCalls,
          message: `تم إرسال ${result.totalCalls} مكالمة بنجاح`,
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.error ?? "فشل في إرسال المكالمات",
        };
      }
    }),

  /**
   * Retry a failed voice call
   */
  retry: adminProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input }) => {
      const result = await retryFailedCall(input.callId);

      if (result.success) {
        return {
          success: true,
          message: "تم إعادة المحاولة بنجاح",
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.error ?? "لا يمكن إعادة المحاولة",
        };
      }
    }),

  /**
   * Get logs for a specific voice call
   */
  getLogs: adminProcedure
    .input(z.object({ callId: z.string() }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.voiceCallLog.findMany({
        where: { voiceCallId: input.callId },
        orderBy: { createdAt: "asc" },
      });

      return logs.map((log) => ({
        id: log.id,
        eventType: log.eventType,
        eventData: log.eventData,
        createdAt: log.createdAt,
      }));
    }),

  /**
   * Get batches for a session
   */
  getBatches: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const batches = await ctx.db.voiceCallBatch.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: "desc" },
        include: {
          triggeredBy: {
            select: { name: true },
          },
        },
      });

      return batches.map((batch) => ({
        id: batch.id,
        name: batch.name,
        status: batch.status,
        totalCalls: batch.totalCalls,
        completedCalls: batch.completedCalls,
        confirmedCount: batch.confirmedCount,
        declinedCount: batch.declinedCount,
        noResponseCount: batch.noResponseCount,
        triggeredByName: batch.triggeredBy?.name,
        createdAt: batch.createdAt,
        dispatchedAt: batch.dispatchedAt,
        completedAt: batch.completedAt,
      }));
    }),

  /**
   * Get registrations available for voice calls (approved, with phone)
   */
  getCallableRegistrations: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const registrations = await ctx.db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          isApproved: true,
          isRejected: false,
          isNotComing: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              labels: {
                select: { id: true, name: true, color: true },
              },
            },
          },
          voiceCalls: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              confirmationResponse: true,
              createdAt: true,
            },
          },
        },
      });

      // Filter registrations that have a phone number (user or guest)
      const withPhone = registrations.filter(
        (reg) => reg.user?.phone || reg.guestPhone
      );

      return withPhone.map((reg) => ({
        id: reg.id,
        name: reg.user?.name ?? reg.guestName ?? "غير معروف",
        phone: reg.user?.phone ?? reg.guestPhone ?? "",
        email: reg.user?.email ?? reg.guestEmail,
        isGuest: !reg.userId,
        labels: reg.user?.labels ?? [],
        lastCall: reg.voiceCalls[0] ?? null,
      }));
    }),
});
