import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import { formatPhoneNumber } from "@/lib/validation";
import { generateQRCode, createQRCheckInData } from "@/lib/qr";
import { sendCompanionEmail } from "@/lib/email";

export const companionRouter = createTRPCRouter({
  /**
   * Add companion to registration
   */
  add: protectedProcedure
    .input(
      z.object({
        registrationId: z.string(),
        name: z.string().min(2),
        company: z.string().optional(),
        title: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get registration
      const registration = await db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          session: true,
          companions: true,
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التسجيل غير موجود",
        });
      }

      // Verify ownership
      if (registration.userId !== session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بإضافة مرافقين لهذا التسجيل",
        });
      }

      // Check companion limit
      if (registration.companions.length >= registration.session.maxCompanions) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `الحد الأقصى للمرافقين هو ${registration.session.maxCompanions}`,
        });
      }

      // Create companion
      const companion = await db.companion.create({
        data: {
          registrationId: input.registrationId,
          name: input.name,
          company: input.company || null,
          title: input.title || null,
          phone: input.phone ? formatPhoneNumber(input.phone) : null,
          email: input.email?.toLowerCase() || null,
        },
      });

      // Send invite email if email provided and registration is approved
      if (companion.email && registration.isApproved) {
        const user = await db.user.findUnique({
          where: { id: session.user.id },
        });

        const qrData = createQRCheckInData({
          type: "attendance",
          registrationId: registration.id,
          sessionId: registration.session.id,
          companionId: companion.id,
        });
        const qrCode = await generateQRCode(qrData);

        await sendCompanionEmail(
          companion.email,
          companion.name,
          user?.name || "المسجل",
          registration.session,
          true,
          qrCode || undefined
        );
      }

      return companion;
    }),

  /**
   * List companions for a registration
   */
  list: protectedProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get registration
      const registration = await db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          companions: true,
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التسجيل غير موجود",
        });
      }

      // Verify ownership
      if (registration.userId !== session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بعرض مرافقين هذا التسجيل",
        });
      }

      return registration.companions;
    }),

  /**
   * Get all companions for session (admin only)
   */
  getSessionCompanions: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const companions = await db.companion.findMany({
        where: {
          registration: {
            sessionId: input.sessionId,
          },
        },
        include: {
          registration: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return companions.map((c) => ({
        ...c,
        registrantName: c.registration.user?.name || c.registration.guestName,
        registrantEmail: c.registration.user?.email || c.registration.guestEmail,
        registrationApproved: c.registration.isApproved,
      }));
    }),

  /**
   * Send invite email to companion
   */
  sendInvite: protectedProcedure
    .input(z.object({ companionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      const companion = await db.companion.findUnique({
        where: { id: input.companionId },
        include: {
          registration: {
            include: {
              session: true,
              user: true,
            },
          },
        },
      });

      if (!companion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المرافق غير موجود",
        });
      }

      // Verify ownership
      if (companion.registration.userId !== session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بإرسال دعوة لهذا المرافق",
        });
      }

      if (!companion.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "المرافق ليس لديه بريد إلكتروني",
        });
      }

      if (!companion.registration.isApproved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التسجيل غير مؤكد بعد",
        });
      }

      // Generate QR and send email
      const qrData = createQRCheckInData({
        type: "attendance",
        registrationId: companion.registration.id,
        sessionId: companion.registration.session.id,
        companionId: companion.id,
      });
      const qrCode = await generateQRCode(qrData);

      await sendCompanionEmail(
        companion.email,
        companion.name,
        companion.registration.user?.name || "المسجل",
        companion.registration.session,
        true,
        qrCode || undefined
      );

      // Update invite sent status
      await db.companion.update({
        where: { id: companion.id },
        data: {
          inviteSent: true,
          inviteSentAt: new Date(),
        },
      });

      return { success: true };
    }),

  /**
   * Remove companion from registration
   */
  remove: protectedProcedure
    .input(z.object({ companionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      const companion = await db.companion.findUnique({
        where: { id: input.companionId },
        include: {
          registration: true,
        },
      });

      if (!companion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المرافق غير موجود",
        });
      }

      // Verify ownership
      if (companion.registration.userId !== session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بحذف هذا المرافق",
        });
      }

      await db.companion.delete({
        where: { id: input.companionId },
      });

      return { success: true };
    }),
});
