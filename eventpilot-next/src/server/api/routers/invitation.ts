import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "../trpc";
import { generateInviteToken } from "@/lib/utils";
import { sendInvitationEmail } from "@/lib/email";
import { toSaudiTime } from "@/lib/timezone";

export const invitationRouter = createTRPCRouter({
  /**
   * Get users available for invitation (admin only)
   * Returns all users with their status (registered/invited)
   */
  getUsersForInvite: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        hasPhone: z.boolean().optional(), // Filter for WhatsApp tab
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get registered user IDs for this session
      const registrations = await db.registration.findMany({
        where: { sessionId: input.sessionId },
        select: { userId: true },
      });
      const registeredUserIds = new Set(
        registrations.map((r) => r.userId).filter((id): id is string => id !== null)
      );

      // Get invited user emails for this session (valid, non-invalidated invites)
      const invites = await db.invite.findMany({
        where: {
          sessionId: input.sessionId,
          used: false,
          invalidated: false,
          expiresAt: { gt: new Date() },
        },
        select: { email: true },
      });
      const invitedEmails = new Set(invites.map((i) => i.email.toLowerCase()));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        isActive: true,
      };

      if (input.search) {
        where.OR = [
          { name: { contains: input.search } },
          { email: { contains: input.search } },
          { phone: { contains: input.search } },
          { companyName: { contains: input.search } },
        ];
      }

      // Fetch more users if filtering by phone (to account for nulls/empty)
      const fetchLimit = input.hasPhone ? input.limit * 3 : input.limit;

      const users = await db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          position: true,
        },
        take: fetchLimit,
        orderBy: { name: "asc" },
      });

      // Filter for users with phone numbers (for WhatsApp tab) - done in JS
      let filteredUsers = users;
      if (input.hasPhone) {
        filteredUsers = users.filter((u) => u.phone && u.phone.trim() !== "");
      }

      // Add status flags to each user and limit results
      return filteredUsers.slice(0, input.limit).map((user) => ({
        ...user,
        isRegistered: registeredUserIds.has(user.id),
        isInvited: invitedEmails.has(user.email.toLowerCase()),
      }));
    }),

  /**
   * Send email invitations (admin only)
   */
  sendInvites: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        emails: z.array(z.string().email()).max(100),
        customMessage: z.string().optional(),
        attachPdf: z.boolean().optional().default(false),
      })
    )
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

      // Fetch sponsors if attaching PDF
      let sponsors: Array<{ name: string; logoUrl: string | null; type: string }> = [];
      if (input.attachPdf) {
        const sponsorships = await db.eventSponsorship.findMany({
          where: { sessionId: input.sessionId },
          include: { sponsor: true },
        });
        sponsors = sponsorships
          .filter((s) => s.sponsor)
          .map((s) => ({
            name: s.sponsor!.name,
            logoUrl: s.sponsor!.logoUrl,
            type: s.sponsorType,
          }));
      }

      // Use session's registration deadline or 7 days if not set
      const expiresAt = session.registrationDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const results: { email: string; success: boolean; error?: string }[] = [];

      for (const email of input.emails) {
        try {
          // Check if valid invite already exists
          const existingInvite = await db.invite.findFirst({
            where: {
              sessionId: input.sessionId,
              email: email.toLowerCase(),
              used: false,
              invalidated: false,
              expiresAt: { gt: new Date() },
            },
          });

          if (existingInvite) {
            results.push({
              email,
              success: false,
              error: "دعوة سارية موجودة مسبقاً",
            });
            continue;
          }

          // Create invite
          const token = generateInviteToken();

          await db.invite.create({
            data: {
              sessionId: input.sessionId,
              email: email.toLowerCase(),
              token,
              expiresAt,
              sentAt: new Date(),
            },
          });

          // Send email
          const baseUrl = process.env.BASE_URL || "http://localhost:3000";
          const registrationLink = `${baseUrl}/event/${session.slug}/register?token=${token}`;
          const sent = await sendInvitationEmail(
            email,
            session,
            registrationLink,
            { attachPdf: input.attachPdf, sponsors }
          );

          results.push({
            email,
            success: sent,
            error: sent ? undefined : "فشل إرسال البريد الإلكتروني",
          });
        } catch (error) {
          results.push({
            email,
            success: false,
            error: "خطأ غير متوقع",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return {
        results,
        summary: {
          total: input.emails.length,
          success: successCount,
          failed: failCount,
        },
      };
    }),

  /**
   * Generate WhatsApp invite links (admin only)
   */
  generateWhatsAppLinks: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        contacts: z
          .array(
            z.object({
              phone: z.string(),
              name: z.string().optional(),
            })
          )
          .max(100),
      })
    )
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

      const baseUrl = process.env.BASE_URL || "http://localhost:3000";

      // Use session's registration deadline or 7 days if not set
      const expiresAt =
        session.registrationDeadline ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const links = await Promise.all(
        input.contacts.map(async (contact) => {
          // Create invite token for each phone
          const token = generateInviteToken();

          await db.invite.create({
            data: {
              sessionId: input.sessionId,
              email: `whatsapp-${contact.phone}@placeholder.local`, // Placeholder for WhatsApp invites
              token,
              expiresAt,
            },
          });

          const registrationUrl = `${baseUrl}/event/${session.slug || session.id}/register?token=${token}`;

          const saudiDate = toSaudiTime(session.date);

          // Build greeting with name if available
          const greeting = contact.name
            ? `مرحباً، ${contact.name}`
            : "مرحباً";

          const message = session.inviteMessage
            ? session.inviteMessage.replace("[رابط التسجيل]", registrationUrl)
            : `${greeting}\n\nندعوك للتسجيل في حدث "${session.title}" في ثلوثية الأعمال.\n\n📅 التاريخ: ${saudiDate?.toLocaleDateString("ar-SA", { numberingSystem: "latn" }) ?? ""}\n\nسجل الآن:\n${registrationUrl}`;

          // Format phone for WhatsApp (remove + and spaces)
          const cleanPhone = contact.phone.replace(/\D/g, "");
          const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

          return {
            phone: contact.phone,
            name: contact.name,
            link: waLink,
            token,
          };
        })
      );

      return { links };
    }),

  /**
   * Get all invites for session with stats (admin only)
   */
  getSessionInvites: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        status: z.enum(["all", "valid", "expired", "used", "invalidated"]).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const now = new Date();

      // Build where clause based on status filter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = { sessionId: input.sessionId };

      if (input.status === "valid") {
        where.used = false;
        where.invalidated = false;
        where.expiresAt = { gt: now };
      } else if (input.status === "expired") {
        where.used = false;
        where.invalidated = false;
        where.expiresAt = { lte: now };
      } else if (input.status === "used") {
        where.used = true;
      } else if (input.status === "invalidated") {
        where.invalidated = true;
      }

      if (input.search) {
        where.email = { contains: input.search };
      }

      const invites = await db.invite.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      // Get stats for all invites in this session
      const allInvites = await db.invite.findMany({
        where: { sessionId: input.sessionId },
        select: { used: true, invalidated: true, expiresAt: true },
      });

      const stats = {
        total: allInvites.length,
        valid: allInvites.filter((i) => !i.used && !i.invalidated && i.expiresAt > now).length,
        expired: allInvites.filter((i) => !i.used && !i.invalidated && i.expiresAt <= now).length,
        used: allInvites.filter((i) => i.used).length,
        invalidated: allInvites.filter((i) => i.invalidated).length,
      };

      return {
        invites: invites.map((i) => ({
          ...i,
          isExpired: !i.invalidated && !i.used && i.expiresAt < now,
          isValid: !i.used && !i.invalidated && i.expiresAt > now,
        })),
        stats,
      };
    }),

  /**
   * Validate invitation token
   */
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const invite = await db.invite.findFirst({
        where: {
          token: input.token,
          used: false,
          invalidated: false,
          expiresAt: { gt: new Date() },
        },
        include: {
          session: {
            select: {
              id: true,
              title: true,
              date: true,
              location: true,
              status: true,
            },
          },
        },
      });

      if (!invite) {
        return {
          valid: false,
          error: "رابط الدعوة غير صالح أو منتهي الصلاحية",
        };
      }

      if (invite.session.status !== "open") {
        return {
          valid: false,
          error: "التسجيل مغلق لهذا الحدث",
        };
      }

      return {
        valid: true,
        session: invite.session,
      };
    }),

  /**
   * Resend invitation email (admin only)
   */
  resendInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const invite = await db.invite.findUnique({
        where: { id: input.inviteId },
        include: { session: true },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الدعوة غير موجودة",
        });
      }

      if (invite.used) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الدعوة مستخدمة مسبقاً",
        });
      }

      if (invite.invalidated) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الدعوة ملغاة",
        });
      }

      // Extend expiry if expired
      let newToken = invite.token;
      if (invite.expiresAt < new Date()) {
        newToken = generateInviteToken();
        const newExpiresAt = invite.session.registrationDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await db.invite.update({
          where: { id: invite.id },
          data: {
            token: newToken,
            expiresAt: newExpiresAt,
          },
        });
      }

      // Skip WhatsApp placeholder emails
      if (invite.email.includes("@placeholder.local")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن إرسال بريد إلكتروني لدعوات WhatsApp",
        });
      }

      const sent = await sendInvitationEmail(invite.email, invite.session, newToken);

      if (!sent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل إرسال البريد الإلكتروني",
        });
      }

      await db.invite.update({
        where: { id: invite.id },
        data: { sentAt: new Date() },
      });

      return { success: true };
    }),

  /**
   * Bulk resend invitations (admin only)
   */
  bulkResend: adminProcedure
    .input(z.object({ inviteIds: z.array(z.string()).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const invites = await db.invite.findMany({
        where: {
          id: { in: input.inviteIds },
          used: false,
          invalidated: false,
          email: { not: { contains: "@placeholder.local" } },
        },
        include: { session: true },
      });

      const results: { id: string; success: boolean; error?: string }[] = [];

      for (const invite of invites) {
        try {
          let newToken = invite.token;
          if (invite.expiresAt < new Date()) {
            newToken = generateInviteToken();
            const newExpiresAt = invite.session.registrationDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await db.invite.update({
              where: { id: invite.id },
              data: { token: newToken, expiresAt: newExpiresAt },
            });
          }

          const sent = await sendInvitationEmail(invite.email, invite.session, newToken);

          if (sent) {
            await db.invite.update({
              where: { id: invite.id },
              data: { sentAt: new Date() },
            });
          }

          results.push({ id: invite.id, success: sent, error: sent ? undefined : "فشل الإرسال" });
        } catch {
          results.push({ id: invite.id, success: false, error: "خطأ غير متوقع" });
        }
      }

      return {
        results,
        summary: {
          total: input.inviteIds.length,
          success: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        },
      };
    }),

  /**
   * Invalidate invitation (admin only)
   * Replaces delete - user can't register with invalidated invite
   */
  invalidateInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const invite = await db.invite.findUnique({
        where: { id: input.inviteId },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الدعوة غير موجودة",
        });
      }

      if (invite.used) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن إلغاء دعوة مستخدمة",
        });
      }

      await db.invite.update({
        where: { id: input.inviteId },
        data: {
          invalidated: true,
          invalidatedAt: new Date(),
        },
      });

      return { success: true };
    }),

  /**
   * Bulk invalidate invitations (admin only)
   */
  bulkInvalidate: adminProcedure
    .input(z.object({ inviteIds: z.array(z.string()).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const result = await db.invite.updateMany({
        where: {
          id: { in: input.inviteIds },
          used: false,
        },
        data: {
          invalidated: true,
          invalidatedAt: new Date(),
        },
      });

      return { success: true, count: result.count };
    }),

  /**
   * Delete invitation (admin only) - kept for backwards compatibility
   */
  deleteInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      await db.invite.delete({
        where: { id: input.inviteId },
      });

      return { success: true };
    }),
});
