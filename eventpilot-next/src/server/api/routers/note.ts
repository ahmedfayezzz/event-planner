import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const noteRouter = createTRPCRouter({
  /**
   * Get all notes for a user
   */
  getByUserId: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const notes = await db.userNote.findMany({
        where: { userId: input.userId },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return notes;
    }),

  /**
   * Create a new note for a user
   */
  create: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        content: z.string().min(1, "محتوى الملاحظة مطلوب"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Verify user exists
      const user = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المستخدم غير موجود",
        });
      }

      const note = await db.userNote.create({
        data: {
          content: input.content,
          userId: input.userId,
          createdById: session.user.id,
        },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
      });

      return note;
    }),

  /**
   * Delete a note (only by creator or super admin)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      const note = await db.userNote.findUnique({
        where: { id: input.id },
      });

      if (!note) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الملاحظة غير موجودة",
        });
      }

      // Only creator or super admin can delete
      if (note.createdById !== session.user.id && session.user.role !== "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكنك حذف هذه الملاحظة",
        });
      }

      await db.userNote.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
