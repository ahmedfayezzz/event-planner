import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import { formatPhoneNumber, generateUsername } from "@/lib/validation";
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

      // Format phone and email
      const formattedPhone = formatPhoneNumber(input.phone);
      const email = input.email?.toLowerCase() || null;

      // Check if user exists with matching phone or email
      let companionUserId: string | null = null;
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { phone: formattedPhone },
            ...(email ? [{ email }] : []),
          ],
        },
      });

      const isApproved = parentRegistration.session.requiresApproval ? false : true;

      if (existingUser) {
        // Check if user is already registered for this session
        const existingReg = await db.registration.findFirst({
          where: {
            sessionId: parentRegistration.sessionId,
            userId: existingUser.id,
          },
        });

        if (existingReg) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "هذا المستخدم مسجل مسبقاً في هذا الحدث",
          });
        }

        companionUserId = existingUser.id;

        // If it's a GUEST user, update their info
        if (existingUser.role === "GUEST") {
          await db.user.update({
            where: { id: existingUser.id },
            data: {
              name: input.name,
              companyName: input.company || existingUser.companyName,
              position: input.title || existingUser.position,
              isActive: isApproved ? true : existingUser.isActive,
            },
          });
        }
      } else {
        // Create new GUEST user for companion
        const username = await generateUsername(input.name);
        const newGuestUser = await db.user.create({
          data: {
            name: input.name,
            username,
            email: email || `companion-${Date.now()}@temp.local`, // Temporary email if not provided
            phone: formattedPhone,
            passwordHash: null,
            role: "GUEST",
            isActive: isApproved,
            companyName: input.company || null,
            position: input.title || null,
          },
        });
        companionUserId = newGuestUser.id;
      }

      // Create invited registration linked to user
      const invitedRegistration = await db.registration.create({
        data: {
          sessionId: parentRegistration.sessionId,
          invitedByRegistrationId: parentRegistration.id,
          isApproved,
          userId: companionUserId,
          // Keep guest fields as backup/display
          guestName: input.name,
          guestCompanyName: input.company || null,
          guestPosition: input.title || null,
          guestPhone: formattedPhone,
          guestEmail: email,
        },
      });

      // Note: No email is sent when companion is added.
      // Companion will receive email only when approved by admin.

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
          invitedRegistrations: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  companyName: true,
                  position: true,
                },
              },
            },
          },
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
        name: r.user?.name || r.guestName || "",
        company: r.user?.companyName || r.guestCompanyName,
        title: r.user?.position || r.guestPosition,
        phone: r.user?.phone || r.guestPhone,
        email: r.user?.email || r.guestEmail,
        createdAt: r.registeredAt,
        isApproved: r.isApproved,
        userId: r.userId,
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              companyName: true,
              position: true,
            },
          },
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
        name: r.user?.name || r.guestName || "",
        company: r.user?.companyName || r.guestCompanyName,
        title: r.user?.position || r.guestPosition,
        phone: r.user?.phone || r.guestPhone,
        email: r.user?.email || r.guestEmail,
        createdAt: r.registeredAt,
        isApproved: r.isApproved,
        userId: r.userId,
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
