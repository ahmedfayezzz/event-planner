import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Registration, PrismaClient } from "@prisma/client";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import { formatPhoneNumber, generateUsername } from "@/lib/validation";
import { generateQRCode, createQRCheckInData } from "@/lib/qr";
import {
  sendPendingEmail,
  sendConfirmedEmail,
  sendCompanionEmail,
  sendWelcomeEmail,
} from "@/lib/email";
import bcrypt from "bcryptjs";

/**
 * Helper function to find or create a user for a companion
 * Returns the userId to link to the registration
 */
async function findOrCreateCompanionUser(
  db: PrismaClient,
  companion: {
    name: string;
    phone: string;
    company?: string;
    title?: string;
    email?: string;
  },
  sessionId: string,
  isApproved: boolean
): Promise<{ userId: string; isExisting: boolean }> {
  const formattedPhone = formatPhoneNumber(companion.phone);
  const email = companion.email?.toLowerCase() || null;

  // Check if user exists with matching phone or email
  const existingUser = await db.user.findFirst({
    where: {
      OR: [
        { phone: formattedPhone },
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (existingUser) {
    // Check if user is already registered for this session
    const existingReg = await db.registration.findFirst({
      where: {
        sessionId,
        userId: existingUser.id,
      },
    });

    if (existingReg) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `المرافق ${companion.name} مسجل مسبقاً في هذا الحدث`,
      });
    }

    // If it's a GUEST user, update their info
    if (existingUser.role === "GUEST") {
      await db.user.update({
        where: { id: existingUser.id },
        data: {
          name: companion.name,
          companyName: companion.company || existingUser.companyName,
          position: companion.title || existingUser.position,
          isActive: isApproved ? true : existingUser.isActive,
        },
      });
    }

    return { userId: existingUser.id, isExisting: true };
  }

  // Create new GUEST user for companion
  const username = await generateUsername(companion.name);
  const newGuestUser = await db.user.create({
    data: {
      name: companion.name,
      username,
      email: email || `companion-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@temp.local`,
      phone: formattedPhone,
      passwordHash: null,
      role: "GUEST",
      isActive: isApproved,
      companyName: companion.company || null,
      position: companion.title || null,
    },
  });

  return { userId: newGuestUser.id, isExisting: false };
}

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
              name: z.string().min(2, "اسم المرافق مطلوب"),
              phone: z.string().min(9, "رقم الهاتف مطلوب"),
              company: z.string().optional(),
              title: z.string().optional(),
              email: z.string().email().optional(),
            })
          )
          .optional()
          .default([]),
        // Sponsorship preferences (only if user is not already a sponsor)
        wantsToSponsor: z.boolean().optional(),
        sponsorshipTypes: z.array(z.string()).optional(),
        sponsorshipOtherText: z.string().optional(),
        sponsorType: z.enum(["person", "company"]).optional(),
        sponsorCompanyName: z.string().optional(),
        // Invitation token for invite-only sessions
        inviteToken: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session: userSession } = ctx;

      // Get session
      const session = await db.session.findUnique({
        where: { id: input.sessionId },
        include: {
          _count: {
            select: { registrations: { where: { isApproved: true, invitedByRegistrationId: null } } },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      // Check if registration is allowed
      if (session.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التسجيل مغلق لهذا الحدث",
        });
      }

      if (session._count.registrations >= session.maxParticipants) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الحدث مكتمل العدد",
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

      // Check invite-only sessions
      if (session.inviteOnly) {
        if (!input.inviteToken) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "هذا الحدث بدعوة فقط",
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
          message: "أنت مسجل مسبقاً في هذا الحدث",
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

      // Create sponsor record if user wants to sponsor and doesn't have one yet
      if (input.wantsToSponsor) {
        const existingSponsor = await db.sponsor.findFirst({
          where: { userId: user.id },
        });

        if (!existingSponsor) {
          // Determine sponsor name: use company name if type is company, otherwise user name
          const sponsorName =
            input.sponsorType === "company" && input.sponsorCompanyName
              ? input.sponsorCompanyName
              : user.name;

          await db.sponsor.create({
            data: {
              name: sponsorName,
              email: user.email,
              phone: user.phone,
              type: input.sponsorType || "person",
              userId: user.id,
              sponsorshipTypes: input.sponsorshipTypes || [],
              sponsorshipOtherText: input.sponsorshipOtherText || null,
            },
          });
        }
      }

      // Determine approval status
      const isApproved = !session.requiresApproval;

      // Create registration
      const registration = await db.registration.create({
        data: {
          userId: userSession.user.id,
          sessionId: input.sessionId,
          isApproved,
        },
      });

      // Create invited registrations (companions) with user matching/creation
      const invitedRegistrations: Registration[] = [];
      for (const companion of input.companions) {
        const companionApproved = session.requiresApproval ? false : true;

        // Find or create user for companion
        const { userId: companionUserId } = await findOrCreateCompanionUser(
          db,
          companion,
          input.sessionId,
          companionApproved
        );

        const invitedReg = await db.registration.create({
          data: {
            sessionId: input.sessionId,
            invitedByRegistrationId: registration.id,
            isApproved: companionApproved,
            userId: companionUserId,
            // Keep guest fields for display/backup
            guestName: companion.name,
            guestCompanyName: companion.company || null,
            guestPosition: companion.title || null,
            guestPhone: companion.phone ? formatPhoneNumber(companion.phone) : null,
            guestEmail: companion.email?.toLowerCase() || null,
          },
        });
        invitedRegistrations.push(invitedReg);
      }

      // Generate QR data if approved
      let qrCode: string | null = null;
      let qrData: string | null = null;
      if (isApproved) {
        qrData = createQRCheckInData({
          type: "attendance",
          registrationId: registration.id,
          sessionId: session.id,
        });
        qrCode = await generateQRCode(qrData);
      }

      // Send confirmation email (pass raw qrData for branded QR generation)
      if (isApproved) {
        await sendConfirmedEmail(user.email, user.name, session, qrData || undefined);
      } else {
        await sendPendingEmail(user.email, user.name, session);
      }

      // Send companion emails
      for (const invitedReg of invitedRegistrations) {
        if (invitedReg.guestEmail) {
          let companionQrData: string | null = null;
          if (isApproved) {
            companionQrData = createQRCheckInData({
              type: "attendance",
              registrationId: invitedReg.id,
              sessionId: session.id,
            });
          }
          await sendCompanionEmail(
            invitedReg.guestEmail,
            invitedReg.guestName || "المرافق",
            user.name,
            session,
            isApproved,
            companionQrData || undefined
          );
        }
      }

      return {
        id: registration.id,
        isApproved,
        companionCount: invitedRegistrations.length,
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
        // Sponsorship preferences
        wantsToSponsor: z.boolean().default(false),
        sponsorshipTypes: z.array(z.string()).default([]),
        sponsorshipOtherText: z.string().optional(),
        sponsorType: z.enum(["person", "company"]).optional(),
        sponsorCompanyName: z.string().optional(),
        // Companions
        companions: z
          .array(
            z.object({
              name: z.string().min(2, "اسم المرافق مطلوب"),
              phone: z.string().min(9, "رقم الهاتف مطلوب"),
              company: z.string().optional(),
              title: z.string().optional(),
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
            select: { registrations: { where: { isApproved: true, invitedByRegistrationId: null } } },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      // Check if registration is allowed
      if (session.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التسجيل مغلق لهذا الحدث",
        });
      }

      if (session._count.registrations >= session.maxParticipants) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الحدث مكتمل العدد",
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
            message: "هذا الحدث بدعوة فقط",
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

      // Determine approval status early (needed for GUEST user isActive)
      const isApproved = !session.requiresApproval;

      // Format phone
      const formattedPhone = formatPhoneNumber(input.phone);

      const email = input.email.toLowerCase();

      let userId: string;
      let isNewAccount = false;

      // Check if phone OR email belongs to existing user (phone priority)
      const existingUser = await db.user.findFirst({
        where: {
          OR: [{ phone: formattedPhone }, { email }],
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
            message: "أنت مسجل مسبقاً في هذا الحدث",
          });
        }

        userId = existingUser.id;

        // If it's a GUEST user, update their info with fresh data
        // Also set them to active if registration is approved
        if (existingUser.role === "GUEST") {
          await db.user.update({
            where: { id: existingUser.id },
            data: {
              name: input.name,
              instagram: input.instagram || existingUser.instagram,
              snapchat: input.snapchat || existingUser.snapchat,
              twitter: input.twitter || existingUser.twitter,
              companyName: input.companyName || existingUser.companyName,
              position: input.position || existingUser.position,
              activityType: input.activityType || existingUser.activityType,
              gender: input.gender || existingUser.gender,
              goal: input.goal || existingUser.goal,
              isActive: isApproved ? true : existingUser.isActive, // Activate if registration approved
            },
          });
        }
      } else if (input.createAccount && input.password) {
        // Create new USER account (with password)
        const username = await generateUsername(input.name);
        const passwordHash = await bcrypt.hash(input.password, 10);

        const newUser = await db.user.create({
          data: {
            name: input.name,
            username,
            email,
            phone: formattedPhone,
            passwordHash,
            role: "USER",
            instagram: input.instagram || null,
            snapchat: input.snapchat || null,
            twitter: input.twitter || null,
            companyName: input.companyName || null,
            position: input.position || null,
            activityType: input.activityType || null,
            gender: input.gender || null,
            goal: input.goal || null,
          },
        });

        userId = newUser.id;
        isNewAccount = true;

        // Send welcome email for new account
        await sendWelcomeEmail(email, input.name);
      } else {
        // Create new GUEST user (no password, cannot login)
        // GUEST users start inactive and become active when registration is approved
        const username = await generateUsername(input.name);

        const newGuestUser = await db.user.create({
          data: {
            name: input.name,
            username,
            email,
            phone: formattedPhone,
            passwordHash: null,
            role: "GUEST",
            isActive: isApproved, // Only active if registration is approved
            instagram: input.instagram || null,
            snapchat: input.snapchat || null,
            twitter: input.twitter || null,
            companyName: input.companyName || null,
            position: input.position || null,
            activityType: input.activityType || null,
            gender: input.gender || null,
            goal: input.goal || null,
          },
        });

        userId = newGuestUser.id;
      }

      // Create registration (always linked to user - no guest* fields needed for primary registrant)
      const registration = await db.registration.create({
        data: {
          userId,
          sessionId: input.sessionId,
          isApproved,
          // Sponsorship interest
          wantsToSponsor: input.wantsToSponsor,
          sponsorshipTypes: input.wantsToSponsor ? input.sponsorshipTypes : [],
          sponsorshipOtherText: input.wantsToSponsor ? input.sponsorshipOtherText || null : null,
          sponsorType: input.wantsToSponsor ? input.sponsorType || null : null,
        },
      });

      // Create invited registrations (companions) with user matching/creation
      const invitedRegistrations: Registration[] = [];
      for (const companion of input.companions) {
        const companionApproved = session.requiresApproval ? false : true;

        // Find or create user for companion
        const { userId: companionUserId } = await findOrCreateCompanionUser(
          db,
          companion,
          input.sessionId,
          companionApproved
        );

        const invitedReg = await db.registration.create({
          data: {
            sessionId: input.sessionId,
            invitedByRegistrationId: registration.id,
            isApproved: companionApproved,
            userId: companionUserId,
            // Keep guest fields for display/backup
            guestName: companion.name,
            guestCompanyName: companion.company || null,
            guestPosition: companion.title || null,
            guestPhone: companion.phone ? formatPhoneNumber(companion.phone) : null,
            guestEmail: companion.email?.toLowerCase() || null,
          },
        });
        invitedRegistrations.push(invitedReg);
      }

      // Generate QR data if approved
      let qrData: string | null = null;
      if (isApproved) {
        qrData = createQRCheckInData({
          type: "attendance",
          registrationId: registration.id,
          sessionId: session.id,
        });
      }

      // Send confirmation email (pass raw qrData for branded QR generation)
      if (isApproved) {
        await sendConfirmedEmail(email, input.name, session, qrData || undefined);
      } else {
        await sendPendingEmail(email, input.name, session);
      }

      // Send companion emails
      for (const invitedReg of invitedRegistrations) {
        if (invitedReg.guestEmail) {
          let companionQrData: string | null = null;
          if (isApproved) {
            companionQrData = createQRCheckInData({
              type: "attendance",
              registrationId: invitedReg.id,
              sessionId: session.id,
            });
          }
          await sendCompanionEmail(
            invitedReg.guestEmail,
            invitedReg.guestName || "المرافق",
            input.name,
            session,
            isApproved,
            companionQrData || undefined
          );
        }
      }

      return {
        id: registration.id,
        isApproved,
        hasAccount: !!userId,
        companionCount: invitedRegistrations.length,
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
        invitedRegistrations: true,
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
        includeInvited: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const registrations = await db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          ...(input.includeUnapproved ? {} : { isApproved: true }),
          ...(input.includeInvited ? {} : { invitedByRegistrationId: null }),
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
              labels: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
          invitedRegistrations: true,
          invitedByRegistration: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { registeredAt: "desc" },
      });

      return registrations.map((r) => ({
        ...r,
        userId: r.user?.id,
        name: r.user?.name || r.guestName,
        email: r.user?.email || r.guestEmail,
        phone: r.user?.phone || r.guestPhone,
        companyName: r.user?.companyName || r.guestCompanyName,
        position: r.user?.position || r.guestPosition,
        labels: r.user?.labels || [],
        isGuest: !r.user,
        isInvited: !!r.invitedByRegistrationId,
        invitedByName: r.invitedByRegistration?.user?.name || r.invitedByRegistration?.guestName,
        companionCount: r.invitedRegistrations.length,
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
          invitedRegistrations: true,
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
        });

        // Check if this is a companion registration
        if (registration.invitedByRegistrationId) {
          // Get parent name for companion email
          const parentReg = await db.registration.findUnique({
            where: { id: registration.invitedByRegistrationId },
            include: { user: true },
          });
          const parentName = parentReg?.user?.name || parentReg?.guestName || "المسجل";
          await sendCompanionEmail(
            email,
            name,
            parentName,
            registration.session,
            true,
            qrData
          );
        } else {
          await sendConfirmedEmail(email, name, registration.session, qrData);
        }
      }

      // Note: Companions are NOT auto-approved when parent is approved
      // They need to be approved separately by admin

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
          message: "الحدث غير موجود",
        });
      }

      // Get pending parent registrations (not invited)
      const pendingRegistrations = await db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          isApproved: false,
          invitedByRegistrationId: null,
        },
        include: {
          user: true,
          invitedRegistrations: true,
        },
      });

      // Update all parent registrations to approved
      await db.registration.updateMany({
        where: {
          sessionId: input.sessionId,
          isApproved: false,
          invitedByRegistrationId: null,
        },
        data: { isApproved: true },
      });

      // Note: Companions are NOT auto-approved when parent is approved
      // They need to be approved separately by admin

      // Send confirmation emails to parent registrations only
      for (const registration of pendingRegistrations) {
        const email = registration.user?.email || registration.guestEmail;
        const name = registration.user?.name || registration.guestName;

        if (email && name) {
          const qrData = createQRCheckInData({
            type: "attendance",
            registrationId: registration.id,
            sessionId: session.id,
          });

          await sendConfirmedEmail(email, name, session, qrData);
        }
      }

      return {
        success: true,
        approvedCount: pendingRegistrations.length,
      };
    }),

  /**
   * Approve multiple specific registrations (admin only)
   */
  approveMultiple: adminProcedure
    .input(z.object({ registrationIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get all pending registrations that match the IDs
      const pendingRegistrations = await db.registration.findMany({
        where: {
          id: { in: input.registrationIds },
          isApproved: false,
        },
        include: {
          user: true,
          session: true,
          invitedRegistrations: true,
        },
      });

      if (pendingRegistrations.length === 0) {
        return {
          success: true,
          approvedCount: 0,
        };
      }

      // Approve all selected registrations
      await db.registration.updateMany({
        where: {
          id: { in: input.registrationIds },
          isApproved: false,
        },
        data: { isApproved: true },
      });

      // Note: Companions are NOT auto-approved when parent is approved
      // They need to be approved separately by admin

      // Send confirmation emails for approved registrations
      for (const registration of pendingRegistrations) {
        const email = registration.user?.email || registration.guestEmail;
        const name = registration.user?.name || registration.guestName;
        const session = registration.session;

        if (email && name && session) {
          // For parent registrations, send confirmed email
          if (registration.invitedByRegistrationId === null) {
            const qrData = createQRCheckInData({
              type: "attendance",
              registrationId: registration.id,
              sessionId: session.id,
            });
            await sendConfirmedEmail(email, name, session, qrData);
          } else {
            // For companion registrations being directly approved, send companion confirmation
            const companionQrData = createQRCheckInData({
              type: "attendance",
              registrationId: registration.id,
              sessionId: session.id,
            });
            // Get parent name for companion email
            const parentReg = await db.registration.findUnique({
              where: { id: registration.invitedByRegistrationId },
              include: { user: true },
            });
            const parentName = parentReg?.user?.name || parentReg?.guestName || "المسجل";
            await sendCompanionEmail(
              email,
              name,
              parentName,
              session,
              true,
              companionQrData
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
   * Update registration (for logged-in users to edit their registration)
   */
  updateRegistration: protectedProcedure
    .input(
      z.object({
        registrationId: z.string(),
        companions: z
          .array(
            z.object({
              id: z.string().optional(), // existing companion ID
              name: z.string().min(2, "اسم المرافق مطلوب"),
              phone: z.string().min(9, "رقم الهاتف مطلوب"),
              company: z.string().optional(),
              title: z.string().optional(),
              email: z.string().email().optional(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session: userSession } = ctx;

      // Get registration and verify ownership
      const registration = await db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          session: true,
          invitedRegistrations: true,
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التسجيل غير موجود",
        });
      }

      // Verify user owns this registration
      if (registration.userId !== userSession.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بتعديل هذا التسجيل",
        });
      }

      // Check companion limit
      if (input.companions.length > registration.session.maxCompanions) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `الحد الأقصى للمرافقين هو ${registration.session.maxCompanions}`,
        });
      }

      // Get existing companion IDs
      const existingCompanionIds = registration.invitedRegistrations.map((r) => r.id);
      const updatedCompanionIds = input.companions.filter((c) => c.id).map((c) => c.id!);

      // Delete companions that were removed
      const companionsToDelete = existingCompanionIds.filter(
        (id) => !updatedCompanionIds.includes(id)
      );
      if (companionsToDelete.length > 0) {
        await db.registration.deleteMany({
          where: {
            id: { in: companionsToDelete },
          },
        });
      }

      // Update or create companions
      for (const companion of input.companions) {
        if (companion.id) {
          // Update existing companion
          await db.registration.update({
            where: { id: companion.id },
            data: {
              guestName: companion.name,
              guestPhone: formatPhoneNumber(companion.phone),
              guestCompanyName: companion.company || null,
              guestPosition: companion.title || null,
              guestEmail: companion.email?.toLowerCase() || null,
            },
          });
        } else {
          // Create new companion with user matching/creation
          const companionApproved = registration.isApproved;

          // Find or create user for companion
          const { userId: companionUserId } = await findOrCreateCompanionUser(
            db,
            companion,
            registration.sessionId,
            companionApproved
          );

          await db.registration.create({
            data: {
              sessionId: registration.sessionId,
              invitedByRegistrationId: registration.id,
              isApproved: companionApproved,
              userId: companionUserId,
              // Keep guest fields for display/backup
              guestName: companion.name,
              guestPhone: formatPhoneNumber(companion.phone),
              guestCompanyName: companion.company || null,
              guestPosition: companion.title || null,
              guestEmail: companion.email?.toLowerCase() || null,
            },
          });
        }
      }

      return { success: true };
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
          invitedRegistrations: true,
          invitedByRegistration: {
            include: {
              user: {
                select: {
                  name: true,
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

      // Map invited registrations to companion-like structure
      const companions = registration.invitedRegistrations.map((r) => ({
        id: r.id,
        name: r.guestName || "",
        company: r.guestCompanyName,
        title: r.guestPosition,
        phone: r.guestPhone,
        email: r.guestEmail,
        isApproved: r.isApproved,
      }));

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
          locationUrl: registration.session.locationUrl,
          maxCompanions: registration.session.maxCompanions,
        },
        companions,
        hasAccount: !!registration.user,
        isInvited: !!registration.invitedByRegistrationId,
        invitedByName: registration.invitedByRegistration?.user?.name || registration.invitedByRegistration?.guestName,
      };
    }),
});
