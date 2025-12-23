import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const suggestionStatusEnum = z.enum(["pending", "reviewed", "implemented", "dismissed"]);

export const suggestionRouter = createTRPCRouter({
  /**
   * Create a new suggestion (logged-in users)
   */
  create: protectedProcedure
    .input(
      z.object({
        content: z
          .string()
          .min(10, "الاقتراح يجب أن يكون 10 أحرف على الأقل")
          .max(1000, "الاقتراح يجب أن لا يتجاوز 1000 حرف"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      const suggestion = await db.suggestion.create({
        data: {
          content: input.content,
          userId: session.user.id,
        },
      });

      return suggestion;
    }),

  /**
   * Get all suggestions (admin only) with pagination and filtering
   */
  getAll: adminProcedure
    .input(
      z.object({
        status: suggestionStatusEnum.optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const { status, page = 1, limit = 20 } = input ?? {};

      const where = status ? { status } : {};

      const [suggestions, total] = await Promise.all([
        db.suggestion.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.suggestion.count({ where }),
      ]);

      return {
        suggestions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get stats by status (admin only)
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const [pending, reviewed, implemented, dismissed, total] = await Promise.all([
      db.suggestion.count({ where: { status: "pending" } }),
      db.suggestion.count({ where: { status: "reviewed" } }),
      db.suggestion.count({ where: { status: "implemented" } }),
      db.suggestion.count({ where: { status: "dismissed" } }),
      db.suggestion.count(),
    ]);

    return { pending, reviewed, implemented, dismissed, total };
  }),

  /**
   * Update suggestion status (admin only)
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: suggestionStatusEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const suggestion = await db.suggestion.findUnique({
        where: { id: input.id },
      });

      if (!suggestion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الاقتراح غير موجود",
        });
      }

      const updated = await db.suggestion.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      return updated;
    }),

  /**
   * Delete a suggestion (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const suggestion = await db.suggestion.findUnique({
        where: { id: input.id },
      });

      if (!suggestion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الاقتراح غير موجود",
        });
      }

      await db.suggestion.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
