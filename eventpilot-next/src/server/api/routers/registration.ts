import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import { formatPhoneNumber, validateSaudiPhone, generateUsername } from "@/lib/validation";
import { generateQRCode, createQRCheckInData } from "@/lib/qr";
import {
  sendConfirmationEmail,
  sendPendingEmail,
  sendConfirmedEmail,
  sendCompanionEmail,
  sendWelcomeEmail,
} from "@/lib/email";
import bcrypt from "bcryptjs";

export const registrationRouter = createTRPCRouter({
  /**
   * Register logged-in user for session
   */
  registerForSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        companions: z
          .array(
            z.object({
              name: z.string().min(2),
              company: z.string().optional(),
              title: z.string().optional(),
              phone: z.string().optional(),
              email: z.string().email().optional(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session: userSession } = ctx;

      // Get session
      const session = await db.session.findUnique({
        where: { id: input.sessionId },
        include: {
          _count: {
            select: { registrations: { where: { isApproved: true } } },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الجلسة غير موجودة",
        });
      }

      // Check if registration is allowed
      if (session.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التسجيل مغلق لهذه الجلسة",
        });
      }

      if (session._count.registrations >= session.maxParticipants) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الجلسة مكتملة العدد",
        });
      }

      if (session.registrationDeadline && new Date() > session.registrationDeadline) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "انتهى موعد التسجيل",
        });
      }

      // Check companion limit
      if (input.companions.length > session.maxCompanions) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `الحد الأقصى للمرافقين هو ${session.maxCompanions}`,
        });
      }

      // Check if user already registered
      const existingReg = await db.registration.findFirst({
        where: {
          sessionId: input.sessionId,
          userId: userSession.user.id,
        },
      });

      if (existingReg) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "أنت مسجل مسبقاً في هذه الجلسة",
        });
      }

      // Get user info for email
      const user = await db.user.findUnique({
        where: { id: userSession.user.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المستخدم غير موجود",
        });
      }

      // Determine approval status
      const isApproved = !session.requiresApproval;

      // Create registration with companions
      const registration = await db.registration.create({
        data: {
          userId: userSession.user.id,
          sessionId: input.sessionId,
          isApproved,
          companions: {
            create: input.companions.map((c) => ({
              name: c.name,
              company: c.company || null,
              title: c.title || null,
              phone: c.phone ? formatPhoneNumber(c.phone) : null,
              email: c.email?.toLowerCase() || null,
            })),
          },
        },
        include: {
          companions: true,
        },
      });

      // Generate QR code if approved
      let qrCode: string | null = null;
      if (isApproved) {
        const qrData = createQRCheckInData({
          type: "attendance",
          registrationId: registration.id,
          sessionId: session.id,
          userId: userSession.user.id,
        });
        qrCode = await generateQRCode(qrData);
      }

      // Send confirmation email
      if (isApproved) {
        await sendConfirmedEmail(user.email, user.name, session, qrCode || undefined);
      } else {
        await sendPendingEmail(user.email, user.name, session);
      }

      // Send companion emails
      for (const companion of registration.companions) {
        if (companion.email) {
          let companionQr: string | null = null;
          if (isApproved) {
            const companionQrData = createQRCheckInData({
              type: "attendance",
              registrationId: registration.id,
              sessionId: session.id,
              companionId: companion.id,
            });
            companionQr = await generateQRCode(companionQrData);
          }
          await sendCompanionEmail(
            companion.email,
            companion.name,
            user.name,
            session,
            isApproved,
            companionQr || undefined
          );
        }
      }

      return {
        id: registration.id,
        isApproved,
        companionCount: registration.companions.length,
        qrCode: isApproved ? qrCode : null,
      };
    }),

  /**
   * Guest registration (no account required)
   */
  guestRegister: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(9),
        instagram: z.string().optional(),
        snapchat: z.string().optional(),
        twitter: z.string().optional(),
        companyName: z.string().optional(),
        position: z.string().optional(),
        activityType: z.string().optional(),
        gender: z.enum(["male", "female"]).optional(),
        goal: z.string().optional(),
        // Optional: create account
        createAccount: z.boolean().default(false),
        password: z.string().min(6).optional(),
        // Invitation token for invite-only sessions
        inviteToken: z.string().optional(),
        // Hosting preferences
        wantsToHost: z.boolean().default(false),
        hostingTypes: z.array(z.string()).default([]),
        // Companions
        companions: z
          .array(
            z.object({
              name: z.string().min(2),
              company: z.string().optional(),
              title: z.string().optional(),
              phone: z.string().optional(),
              email: z.string().email().optional(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get session
      const session = await db.session.findUnique({
        where: { id: input.sessionId },
        include: {
          _count: {
            select: { registrations: { where: { isApproved: true } } },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الجلسة غير موجودة",
        });
      }

      // Check if registration is allowed
      if (session.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التسجيل مغلق لهذه الجلسة",
        });
      }

      if (session._count.registrations >= session.maxParticipants) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الجلسة مكتملة العدد",
        });
      }

      if (session.registrationDeadline && new Date() > session.registrationDeadline) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "انتهى موعد التسجيل",
        });
      }

      // Check invite-only sessions
      if (session.inviteOnly) {
        if (!input.inviteToken) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "هذه الجلسة بدعوة فقط",
          });
        }

        const invite = await db.invite.findFirst({
          where: {
            token: input.inviteToken,
            sessionId: session.id,
            used: false,
            expiresAt: { gt: new Date() },
          },
        });

        if (!invite) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "رابط الدعوة غير صالح أو منتهي الصلاحية",
          });
        }

        // Mark invite as used
        await db.invite.update({
          where: { id: invite.id },
          data: { used: true },
        });
      }

      // Check companion limit
      if (input.companions.length > session.maxCompanions) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `الحد الأقصى للمرافقين هو ${session.maxCompanions}`,
        });
      }

      // Format phone
      const formattedPhone = formatPhoneNumber(input.phone);
      if (!validateSaudiPhone(input.phone)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رقم الهاتف غير صالح",
        });
      }

      const email = input.email.toLowerCase();

      // Check for duplicate registration
      const existingReg = await db.registration.findFirst({
        where: {
          sessionId: input.sessionId,
          OR: [{ guestEmail: email }, { guestPhone: formattedPhone }],
        },
      });

      if (existingReg) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "أنت مسجل مسبقاً في هذه الجلسة",
        });
      }

      let userId: string | null = null;

      // Check if email/phone belongs to existing user
      const existingUser = await db.user.findFirst({
        where: {
          OR: [{ email }, { phone: formattedPhone }],
        },
      });

      if (existingUser) {
        // Check if user already registered for this session
        const userReg = await db.registration.findFirst({
          where: {
            sessionId: input.sessionId,
            userId: existingUser.id,
          },
        });

        if (userReg) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "أنت مسجل مسبقاً في هذه الجلسة",
          });
        }

        userId = existingUser.id;
      } else if (input.createAccount && input.password) {
        // Create new user account
        const username = await generateUsername(input.name);
        const passwordHash = await bcrypt.hash(input.password, 10);

        const newUser = await db.user.create({
          data: {
            name: input.name,
            username,
            email,
            phone: formattedPhone,
            passwordHash,
            instagram: input.instagram || null,
            snapchat: input.snapchat || null,
            twitter: input.twitter || null,
            companyName: input.companyName || null,
            position: input.position || null,
            activityType: input.activityType || null,
            gender: input.gender || null,
            goal: input.goal || null,
            wantsToHost: input.wantsToHost,
            hostingTypes: input.wantsToHost ? input.hostingTypes : [],
          },
        });

        userId = newUser.id;

        // Send welcome email for new account
        await sendWelcomeEmail(email, input.name);
      }

      // Determine approval status
      const isApproved = !session.requiresApproval;

      // Create registration
      const registration = await db.registration.create({
        data: {
          userId,
          sessionId: input.sessionId,
          isApproved,
          guestName: userId ? null : input.name,
          guestEmail: userId ? null : email,
          guestPhone: userId ? null : formattedPhone,
          guestInstagram: userId ? null : input.instagram || null,
          guestSnapchat: userId ? null : input.snapchat || null,
          guestTwitter: userId ? null : input.twitter || null,
          guestCompanyName: userId ? null : input.companyName || null,
          guestPosition: userId ? null : input.position || null,
          guestActivityType: userId ? null : input.activityType || null,
          guestGender: userId ? null : input.gender || null,
          guestGoal: userId ? null : input.goal || null,
          guestWantsToHost: userId ? false : input.wantsToHost,
          guestHostingTypes: userId ? [] : (input.wantsToHost ? input.hostingTypes : []),
          companions: {
            create: input.companions.map((c) => ({
              name: c.name,
              company: c.company || null,
              title: c.title || null,
              phone: c.phone ? formatPhoneNumber(c.phone) : null,
              email: c.email?.toLowerCase() || null,
            })),
          },
        },
        include: {
          companions: true,
        },
      });

      // Generate QR code if approved
      let qrCode: string | null = null;
      if (isApproved) {
        const qrData = createQRCheckInData({
          type: "attendance",
          registrationId: registration.id,
          sessionId: session.id,
          userId: userId || undefined,
        });
        qrCode = await generateQRCode(qrData);
      }

      // Send confirmation email
      if (isApproved) {
        await sendConfirmedEmail(email, input.name, session, qrCode || undefined);
      } else {
        await sendPendingEmail(email, input.name, session);
      }

      // Send companion emails
      for (const companion of registration.companions) {
        if (companion.email) {
          let companionQr: string | null = null;
          if (isApproved) {
            const companionQrData = createQRCheckInData({
              type: "attendance",
              registrationId: registration.id,
              sessionId: session.id,
              companionId: companion.id,
            });
            companionQr = await generateQRCode(companionQrData);
          }
          await sendCompanionEmail(
            companion.email,
            companion.name,
            input.name,
            session,
            isApproved,
            companionQr || undefined
          );
        }
      }

      return {
        id: registration.id,
        isApproved,
        hasAccount: !!userId,
        companionCount: registration.companions.length,
      };
    }),

  /**
   * Get current user's registrations
   */
  getMyRegistrations: protectedProcedure.query(async ({ ctx }) => {
    const { db, session } = ctx;

    const registrations = await db.registration.findMany({
      where: { userId: session.user.id },
      include: {
        session: true,
        companions: true,
      },
      orderBy: { registeredAt: "desc" },
    });

    return registrations;
  }),

  /**
   * Get all registrations for session (admin only)
   */
  getSessionRegistrations: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        includeUnapproved: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const registrations = await db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          ...(input.includeUnapproved ? {} : { isApproved: true }),
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
          companions: true,
        },
        orderBy: { registeredAt: "desc" },
      });

      return registrations.map((r) => ({
        ...r,
        name: r.user?.name || r.guestName,
        email: r.user?.email || r.guestEmail,
        phone: r.user?.phone || r.guestPhone,
        companyName: r.user?.companyName || r.guestCompanyName,
        position: r.user?.position || r.guestPosition,
        isGuest: !r.user,
      }));
    }),

  /**
   * Approve single registration (admin only)
   */
  approve: adminProcedure
    .input(
      z.object({
        registrationId: z.string(),
        approvalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const registration = await db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          session: true,
          user: true,
          companions: true,
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التسجيل غير موجود",
        });
      }

      if (registration.isApproved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التسجيل موافق عليه مسبقاً",
        });
      }

      await db.registration.update({
        where: { id: input.registrationId },
        data: {
          isApproved: true,
          approvalNotes: input.approvalNotes || null,
        },
      });

      // Send confirmation email
      const email = registration.user?.email || registration.guestEmail;
      const name = registration.user?.name || registration.guestName;

      if (email && name) {
        const qrData = createQRCheckInData({
          type: "attendance",
          registrationId: registration.id,
          sessionId: registration.session.id,
          userId: registration.userId || undefined,
        });
        const qrCode = await generateQRCode(qrData);

        await sendConfirmedEmail(email, name, registration.session, qrCode || undefined);
      }

      // Send companion emails
      for (const companion of registration.companions) {
        if (companion.email) {
          const companionQrData = createQRCheckInData({
            type: "attendance",
            registrationId: registration.id,
            sessionId: registration.session.id,
            companionId: companion.id,
          });
          const companionQr = await generateQRCode(companionQrData);

          await sendCompanionEmail(
            companion.email,
            companion.name,
            name || "المسجل",
            registration.session,
            true,
            companionQr || undefined
          );
        }
      }

      return { success: true };
    }),

  /**
   * Bulk approve registrations (admin only)
   */
  approveAll: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const session = await db.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الجلسة غير موجودة",
        });
      }

      const pendingRegistrations = await db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          isApproved: false,
        },
        include: {
          user: true,
          companions: true,
        },
      });

      // Update all to approved
      await db.registration.updateMany({
        where: {
          sessionId: input.sessionId,
          isApproved: false,
        },
        data: { isApproved: true },
      });

      // Send confirmation emails
      for (const registration of pendingRegistrations) {
        const email = registration.user?.email || registration.guestEmail;
        const name = registration.user?.name || registration.guestName;

        if (email && name) {
          const qrData = createQRCheckInData({
            type: "attendance",
            registrationId: registration.id,
            sessionId: session.id,
            userId: registration.userId || undefined,
          });
          const qrCode = await generateQRCode(qrData);

          await sendConfirmedEmail(email, name, session, qrCode || undefined);
        }

        // Send companion emails
        for (const companion of registration.companions) {
          if (companion.email) {
            const companionQrData = createQRCheckInData({
              type: "attendance",
              registrationId: registration.id,
              sessionId: session.id,
              companionId: companion.id,
            });
            const companionQr = await generateQRCode(companionQrData);

            await sendCompanionEmail(
              companion.email,
              companion.name,
              name || "المسجل",
              session,
              true,
              companionQr || undefined
            );
          }
        }
      }

      return {
        success: true,
        approvedCount: pendingRegistrations.length,
      };
    }),

  /**
   * Get registration confirmation data
   */
  getConfirmation: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const registration = await db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          session: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          companions: true,
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التسجيل غير موجود",
        });
      }

      return {
        id: registration.id,
        name: registration.user?.name || registration.guestName,
        email: registration.user?.email || registration.guestEmail,
        isApproved: registration.isApproved,
        registeredAt: registration.registeredAt,
        session: {
          id: registration.session.id,
          title: registration.session.title,
          date: registration.session.date,
          location: registration.session.location,
        },
        companions: registration.companions,
        hasAccount: !!registration.user,
      };
    }),
});
