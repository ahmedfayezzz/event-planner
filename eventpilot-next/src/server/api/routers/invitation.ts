import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "../trpc";
import { generateInviteToken } from "@/lib/utils";
import { sendInvitationEmail } from "@/lib/email";

export const invitationRouter = createTRPCRouter({
  /**
   * Get users available for invitation (admin only)
   */
  getUsersForInvite: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get users who are not already registered for this session
      const registeredUserIds = await db.registration.findMany({
        where: { sessionId: input.sessionId },
        select: { userId: true },
      });

      const registeredIds = registeredUserIds
        .map((r) => r.userId)
        .filter((id): id is string => id !== null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        id: { notIn: registeredIds },
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
        take: input.limit,
        orderBy: { name: "asc" },
      });

      return users;
    }),

  /**
   * Send email invitations (admin only)
   */
  sendInvites: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        emails: z.array(z.string().email()),
        customMessage: z.string().optional(),
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
          message: "الجلسة غير موجودة",
        });
      }

      const results: { email: string; success: boolean; error?: string }[] = [];

      for (const email of input.emails) {
        try {
          // Check if invite already exists
          const existingInvite = await db.invite.findFirst({
            where: {
              sessionId: input.sessionId,
              email: email.toLowerCase(),
              used: false,
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
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

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
          const sent = await sendInvitationEmail(
            email,
            session,
            token,
            input.customMessage
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
        phones: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
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

      const baseUrl = process.env.BASE_URL || "http://localhost:3000";

      const links = await Promise.all(
        input.phones.map(async (phone) => {
          // Create invite token for each phone
          const token = generateInviteToken();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          await db.invite.create({
            data: {
              sessionId: input.sessionId,
              email: `whatsapp-${phone}@placeholder.local`, // Placeholder for WhatsApp invites
              token,
              expiresAt,
            },
          });

          const registrationUrl = `${baseUrl}/event/${session.slug || session.id}/register?token=${token}`;

          const message = session.inviteMessage
            ? session.inviteMessage.replace("[رابط التسجيل]", registrationUrl)
            : `مرحباً،\n\nندعوك للتسجيل في جلسة "${session.title}" في ثلوثية الأعمال.\n\n📅 التاريخ: ${session.date.toLocaleDateString("ar-SA")}\n\nسجل الآن:\n${registrationUrl}`;

          // Format phone for WhatsApp (remove + and spaces)
          const cleanPhone = phone.replace(/\D/g, "");
          const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

          return {
            phone,
            link: waLink,
            token,
          };
        })
      );

      return { links };
    }),

  /**
   * Get all invites for session (admin only)
   */
  getSessionInvites: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const invites = await db.invite.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: "desc" },
      });

      return invites.map((i) => ({
        ...i,
        isExpired: i.expiresAt < new Date(),
        isValid: !i.used && i.expiresAt > new Date(),
      }));
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
          error: "التسجيل مغلق لهذه الجلسة",
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

      // Extend expiry if expired
      let newToken = invite.token;
      if (invite.expiresAt < new Date()) {
        newToken = generateInviteToken();
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);

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
   * Delete invitation (admin only)
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
