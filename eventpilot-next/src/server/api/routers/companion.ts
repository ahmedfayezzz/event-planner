import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import { formatPhoneNumber } from "@/lib/validation";
import { createQRCheckInData } from "@/lib/qr";
import { sendCompanionEmail } from "@/lib/email";

export const companionRouter = createTRPCRouter({
  /**
   * Add companion (invited registration) to a parent registration
   */
  add: protectedProcedure
    .input(
      z.object({
        registrationId: z.string(),
        name: z.string().min(2, "اسم المرافق مطلوب"),
        company: z.string().optional(),
        title: z.string().optional(),
        phone: z.string().min(9, "رقم الهاتف مطلوب"),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get parent registration
      const parentRegistration = await db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          session: true,
          invitedRegistrations: true,
        },
      });

      if (!parentRegistration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التسجيل غير موجود",
        });
      }

      // Verify ownership
      if (parentRegistration.userId !== session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بإضافة مرافقين لهذا التسجيل",
        });
      }

      // Check companion limit
      if (parentRegistration.invitedRegistrations.length >= parentRegistration.session.maxCompanions) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `الحد الأقصى للمرافقين هو ${parentRegistration.session.maxCompanions}`,
        });
      }

      // Create invited registration (companion)
      const invitedRegistration = await db.registration.create({
        data: {
          sessionId: parentRegistration.sessionId,
          invitedByRegistrationId: parentRegistration.id,
          isApproved: parentRegistration.session.requiresApproval ? false : true,
          guestName: input.name,
          guestCompanyName: input.company || null,
          guestPosition: input.title || null,
          guestPhone: formatPhoneNumber(input.phone),
          guestEmail: input.email?.toLowerCase() || null,
        },
      });

      // Send invite email if email provided and parent registration is approved
      if (invitedRegistration.guestEmail && parentRegistration.isApproved) {
        const user = await db.user.findUnique({
          where: { id: session.user.id },
        });

        const qrData = createQRCheckInData({
          type: "attendance",
          registrationId: invitedRegistration.id,
          sessionId: parentRegistration.session.id,
        });

        await sendCompanionEmail(
          invitedRegistration.guestEmail,
          invitedRegistration.guestName || "المرافق",
          user?.name || "المسجل",
          parentRegistration.session,
          true,
          qrData
        );
      }

      return invitedRegistration;
    }),

  /**
   * List companions (invited registrations) for a parent registration
   */
  list: protectedProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get parent registration with invited registrations
      const registration = await db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          invitedRegistrations: true,
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

      // Map to companion-like structure for backward compatibility
      return registration.invitedRegistrations.map((r) => ({
        id: r.id,
        registrationId: registration.id,
        name: r.guestName || "",
        company: r.guestCompanyName,
        title: r.guestPosition,
        phone: r.guestPhone,
        email: r.guestEmail,
        createdAt: r.registeredAt,
        isApproved: r.isApproved,
      }));
    }),

  /**
   * Get all companions (invited registrations) for session (admin only)
   */
  getSessionCompanions: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get all invited registrations for this session
      const invitedRegistrations = await db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          invitedByRegistrationId: { not: null },
        },
        include: {
          invitedByRegistration: {
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
        orderBy: { registeredAt: "desc" },
      });

      return invitedRegistrations.map((r) => ({
        id: r.id,
        registrationId: r.invitedByRegistrationId,
        name: r.guestName || "",
        company: r.guestCompanyName,
        title: r.guestPosition,
        phone: r.guestPhone,
        email: r.guestEmail,
        createdAt: r.registeredAt,
        isApproved: r.isApproved,
        registrantName: r.invitedByRegistration?.user?.name || r.invitedByRegistration?.guestName,
        registrantEmail: r.invitedByRegistration?.user?.email || r.invitedByRegistration?.guestEmail,
        registrationApproved: r.invitedByRegistration?.isApproved,
      }));
    }),

  /**
   * Send invite email to companion (invited registration)
   */
  sendInvite: protectedProcedure
    .input(z.object({ companionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get the invited registration
      const invitedRegistration = await db.registration.findUnique({
        where: { id: input.companionId },
        include: {
          session: true,
          invitedByRegistration: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!invitedRegistration || !invitedRegistration.invitedByRegistrationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المرافق غير موجود",
        });
      }

      // Verify ownership (user owns the parent registration)
      if (invitedRegistration.invitedByRegistration?.userId !== session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بإرسال دعوة لهذا المرافق",
        });
      }

      if (!invitedRegistration.guestEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "المرافق ليس لديه بريد إلكتروني",
        });
      }

      if (!invitedRegistration.isApproved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التسجيل غير مؤكد بعد",
        });
      }

      // Generate QR data and send email
      const qrData = createQRCheckInData({
        type: "attendance",
        registrationId: invitedRegistration.id,
        sessionId: invitedRegistration.session.id,
      });

      await sendCompanionEmail(
        invitedRegistration.guestEmail,
        invitedRegistration.guestName || "المرافق",
        invitedRegistration.invitedByRegistration?.user?.name || "المسجل",
        invitedRegistration.session,
        true,
        qrData
      );

      return { success: true };
    }),

  /**
   * Remove companion (delete invited registration)
   */
  remove: protectedProcedure
    .input(z.object({ companionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get the invited registration
      const invitedRegistration = await db.registration.findUnique({
        where: { id: input.companionId },
        include: {
          invitedByRegistration: true,
        },
      });

      if (!invitedRegistration || !invitedRegistration.invitedByRegistrationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المرافق غير موجود",
        });
      }

      // Verify ownership (user owns the parent registration)
      if (invitedRegistration.invitedByRegistration?.userId !== session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بحذف هذا المرافق",
        });
      }

      await db.registration.delete({
        where: { id: input.companionId },
      });

      return { success: true };
    }),
});
