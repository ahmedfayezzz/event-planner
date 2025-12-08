import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const labelRouter = createTRPCRouter({
  /**
   * Get all labels
   */
  getAll: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const labels = await db.userLabel.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return labels;
  }),

  /**
   * Create a new label
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "اسم التصنيف مطلوب"),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, "صيغة اللون غير صحيحة").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Check if label already exists
      const existing = await db.userLabel.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "تصنيف بنفس الاسم موجود بالفعل",
        });
      }

      const label = await db.userLabel.create({
        data: {
          name: input.name,
          color: input.color || "#3b82f6",
        },
      });

      return label;
    }),

  /**
   * Update a label
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "اسم التصنيف مطلوب").optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, "صيغة اللون غير صحيحة").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const label = await db.userLabel.update({
        where: { id: input.id },
        data: {
          name: input.name,
          color: input.color,
        },
      });

      return label;
    }),

  /**
   * Delete a label
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      await db.userLabel.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Assign labels to a user
   */
  assignToUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        labelIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Disconnect all existing labels
      await db.user.update({
        where: { id: input.userId },
        data: {
          labels: {
            set: [],
          },
        },
      });

      // Connect new labels
      await db.user.update({
        where: { id: input.userId },
        data: {
          labels: {
            connect: input.labelIds.map((id) => ({ id })),
          },
        },
      });

      return { success: true };
    }),

  /**
   * Create label and assign to user in one operation
   */
  createAndAssign: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().min(1, "اسم التصنيف مطلوب"),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, "صيغة اللون غير صحيحة").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Check if label already exists
      let label = await db.userLabel.findUnique({
        where: { name: input.name },
      });

      // Create if doesn't exist
      if (!label) {
        label = await db.userLabel.create({
          data: {
            name: input.name,
            color: input.color || "#3b82f6",
          },
        });
      }

      // Assign to user
      await db.user.update({
        where: { id: input.userId },
        data: {
          labels: {
            connect: { id: label.id },
          },
        },
      });

      return label;
    }),
});
