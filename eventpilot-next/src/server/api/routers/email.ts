import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../trpc";

export const emailRouter = createTRPCRouter({
  /**
   * Get email statistics
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [pending, sent, failed, total] = await Promise.all([
      ctx.db.emailLog.count({ where: { status: "pending" } }),
      ctx.db.emailLog.count({ where: { status: "sent" } }),
      ctx.db.emailLog.count({ where: { status: "failed" } }),
      ctx.db.emailLog.count(),
    ]);

    return { pending, sent, failed, total };
  }),

  /**
   * Get email logs with filtering and pagination
   */
  getLogs: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "sent", "failed"]).optional(),
        type: z.string().optional(),
        sessionId: z.string().optional(),
        registrationId: z.string().optional(),
        search: z.string().optional(), // Search in to/subject
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(), // For pagination
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, type, sessionId, registrationId, search, limit, cursor } = input;

      const where: {
        status?: string;
        type?: string;
        sessionId?: string;
        registrationId?: string;
        OR?: Array<{ to: { contains: string; mode: "insensitive" } } | { subject: { contains: string; mode: "insensitive" } }>;
      } = {};

      if (status) where.status = status;
      if (type) where.type = type;
      if (sessionId) where.sessionId = sessionId;
      if (registrationId) where.registrationId = registrationId;
      if (search) {
        where.OR = [
          { to: { contains: search, mode: "insensitive" } },
          { subject: { contains: search, mode: "insensitive" } },
        ];
      }

      const logs = await ctx.db.emailLog.findMany({
        where,
        take: limit + 1, // Fetch one extra for cursor
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (logs.length > limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem?.id;
      }

      return {
        logs,
        nextCursor,
      };
    }),

  /**
   * Get failed emails for retry
   */
  getFailedEmails: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.emailLog.findMany({
        where: { status: "failed" },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  /**
   * Mark a failed email for retry (resets status to pending)
   * Note: This only marks for retry - actual resend would need email content stored
   */
  markForRetry: adminProcedure
    .input(z.object({ logId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.db.emailLog.findUnique({
        where: { id: input.logId },
      });

      if (!log) {
        throw new Error("Email log not found");
      }

      if (log.status !== "failed") {
        throw new Error("Only failed emails can be retried");
      }

      // Reset status to allow manual re-trigger
      // Note: The actual email content is not stored, so this is just a marker
      // The admin would need to manually re-trigger the operation that sends the email
      await ctx.db.emailLog.update({
        where: { id: input.logId },
        data: {
          status: "pending",
          errorMessage: null,
          attempts: 0,
        },
      });

      return { success: true };
    }),

  /**
   * Delete old email logs (cleanup)
   */
  cleanup: adminProcedure
    .input(
      z.object({
        olderThanDays: z.number().min(1).max(365).default(30),
        status: z.enum(["sent", "failed", "all"]).default("sent"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays);

      const where: { createdAt: { lt: Date }; status?: string } = {
        createdAt: { lt: cutoffDate },
      };

      if (input.status !== "all") {
        where.status = input.status;
      }

      const result = await ctx.db.emailLog.deleteMany({ where });

      return { deleted: result.count };
    }),
});
