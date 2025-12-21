import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import { generateSlug } from "@/lib/utils";
import {
  startOfDayInSaudi,
  endOfDayInSaudi,
  startOfWeekInSaudi,
  endOfWeekInSaudi,
  startOfMonthInSaudi,
  endOfMonthInSaudi,
} from "@/lib/timezone";

export const sessionRouter = createTRPCRouter({
  /**
   * List all sessions with optional filters
   */
  list: publicProcedure
    .input(
      z
        .object({
          status: z.enum(["open", "closed", "completed"]).optional(),
          upcoming: z.boolean().optional(),
          dateRange: z.enum(["today", "week", "month", "all"]).optional(),
          sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
          limit: z.number().min(1).max(100).optional().default(50),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      if (input?.status) {
        where.status = input.status;
      }

      // Always filter for active (published) sessions in public listings
      where.visibilityStatus = "active";
      where.inviteOnly = false; // Don't show invite-only sessions in public listings

      if (input?.upcoming) {
        where.date = { gt: new Date() };
        where.status = "open";
      }

      // Date range filtering for checkin page (using Saudi Arabia timezone)
      if (input?.dateRange && input.dateRange !== "all") {
        if (input.dateRange === "today") {
          where.date = {
            gte: startOfDayInSaudi(),
            lte: endOfDayInSaudi(),
          };
        } else if (input.dateRange === "week") {
          where.date = {
            gte: startOfWeekInSaudi(),
            lte: endOfWeekInSaudi(),
          };
        } else if (input.dateRange === "month") {
          where.date = {
            gte: startOfMonthInSaudi(),
            lte: endOfMonthInSaudi(),
          };
        }
      }

      // Use ASC for upcoming sessions (public), DESC for admin views
      const sortOrder = input?.sortOrder ?? "desc";

      const sessions = await db.session.findMany({
        where,
        orderBy: { date: sortOrder },
        take: (input?.limit ?? 50) + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        include: {
          _count: {
            select: { registrations: { where: { isApproved: true } } },
          },
        },
      });

      let nextCursor: string | undefined;
      if (sessions.length > (input?.limit ?? 50)) {
        const nextItem = sessions.pop();
        nextCursor = nextItem?.id;
      }

      return {
        sessions: sessions.map((s) => ({
          ...s,
          registrationCount: s.showParticipantCount
            ? s._count.registrations
            : null,
          isFull: s._count.registrations >= s.maxParticipants,
          canRegister:
            s.status === "open" &&
            s._count.registrations < s.maxParticipants &&
            (!s.registrationDeadline || new Date() < s.registrationDeadline),
        })),
        nextCursor,
      };
    }),

  /**
   * Get upcoming open sessions
   */
  getUpcoming: publicProcedure
    .input(
      z
        .object({ limit: z.number().min(1).max(10).optional().default(5) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const sessions = await db.session.findMany({
        where: {
          date: { gt: new Date() },
          status: "open",
          inviteOnly: false, // Don't show invite-only sessions in public listings
          visibilityStatus: "active", // Only show active sessions in public
        },
        orderBy: { date: "asc" },
        take: input?.limit ?? 5,
        include: {
          _count: {
            select: { registrations: { where: { isApproved: true } } },
          },
        },
      });

      return sessions.map((s) => ({
        ...s,
        registrationCount: s.showParticipantCount
          ? s._count.registrations
          : null,
        isFull: s._count.registrations >= s.maxParticipants,
        canRegister:
          s.status === "open" &&
          s._count.registrations < s.maxParticipants &&
          (!s.registrationDeadline || new Date() < s.registrationDeadline),
      }));
    }),

  /**
   * Get session by ID (public - only returns active/published sessions)
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const session = await db.session.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { registrations: { where: { isApproved: true } } },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      // Only return active (published) sessions in public view
      if (session.visibilityStatus !== "active") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      return {
        ...session,
        registrationCount: session.showParticipantCount
          ? session._count.registrations
          : null,
        isFull: session._count.registrations >= session.maxParticipants,
        canRegister:
          session.status === "open" &&
          session._count.registrations < session.maxParticipants &&
          (!session.registrationDeadline ||
            new Date() < session.registrationDeadline),
      };
    }),

  /**
   * Get detailed session info for admin
   */
  getAdminDetails: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const session = await db.session.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              registrations: true,
              attendances: { where: { attended: true } },
              invites: true,
            },
          },
          registrations: {
            take: 10,
            orderBy: { registeredAt: "desc" },
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true, companyName: true, position: true },
              },
              invitedRegistrations: true,
            },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      // Get registration stats
      const [approvedCount, pendingCount, guestCount] = await Promise.all([
        db.registration.count({
          where: { sessionId: input.id, isApproved: true },
        }),
        db.registration.count({
          where: { sessionId: input.id, isApproved: false },
        }),
        db.registration.count({
          where: { sessionId: input.id, userId: null },
        }),
      ]);

      return {
        ...session,
        stats: {
          totalRegistrations: session._count.registrations,
          approvedRegistrations: approvedCount,
          pendingRegistrations: pendingCount,
          guestRegistrations: guestCount,
          attendance: session._count.attendances,
          invitesSent: session._count.invites,
          availableSpots: session.maxParticipants - approvedCount,
          fillRate: Math.round((approvedCount / session.maxParticipants) * 100),
          attendanceRate:
            approvedCount > 0
              ? Math.round((session._count.attendances / approvedCount) * 100)
              : 0,
        },
        recentRegistrations: session.registrations.map((r) => ({
          id: r.id,
          userId: r.user?.id,
          name: r.user?.name || r.guestName,
          email: r.user?.email || r.guestEmail,
          phone: r.user?.phone || r.guestPhone,
          companyName: r.user?.companyName || r.guestCompanyName,
          position: r.user?.position || r.guestPosition,
          isGuest: !r.user,
          isApproved: r.isApproved,
          registeredAt: r.registeredAt,
          companionCount: r.invitedRegistrations.length,
        })),
      };
    }),

  /**
   * Get session by slug (public - only returns active/published sessions)
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const session = await db.session.findUnique({
        where: { slug: input.slug },
        include: {
          _count: {
            select: { registrations: { where: { isApproved: true } } },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      // Only return active (published) sessions in public view
      if (session.visibilityStatus !== "active") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      return {
        ...session,
        registrationCount: session.showParticipantCount
          ? session._count.registrations
          : null,
        isFull: session._count.registrations >= session.maxParticipants,
        canRegister:
          session.status === "open" &&
          session._count.registrations < session.maxParticipants &&
          (!session.registrationDeadline ||
            new Date() < session.registrationDeadline),
      };
    }),

  /**
   * Get next session number (admin only)
   */
  getNextSessionNumber: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const lastSession = await db.session.findFirst({
      orderBy: { sessionNumber: "desc" },
      select: { sessionNumber: true },
    });

    return { nextSessionNumber: (lastSession?.sessionNumber ?? 0) + 1 };
  }),

  /**
   * Create new session (admin only)
   * Session number is auto-generated based on the highest existing number + 1
   */
  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        date: z.date(),
        guestName: z.string().optional(),
        guestProfile: z.string().optional(),
        maxParticipants: z.number().int().positive().default(50),
        maxCompanions: z.number().int().min(0).default(5),
        requiresApproval: z.boolean().default(false),
        showParticipantCount: z.boolean().default(true),
        location: z.string().optional(),
        registrationDeadline: z.date().optional(),
        showCountdown: z.boolean().default(true),
        showGuestProfile: z.boolean().default(true),
        enableMiniView: z.boolean().default(false),
        customConfirmationMessage: z.string().optional(),
        embedEnabled: z.boolean().default(true),
        slug: z.string().optional(),
        inviteOnly: z.boolean().default(false),
        inviteMessage: z.string().optional(),
        sendQrInEmail: z.boolean().default(true),
        showSocialMediaFields: z.boolean().default(true),
        showRegistrationPurpose: z.boolean().default(true),
        showCateringInterest: z.boolean().default(true),
        locationUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const sessionData = input;

      // Auto-generate session number (highest + 1)
      const lastSession = await db.session.findFirst({
        orderBy: { sessionNumber: "desc" },
        select: { sessionNumber: true },
      });
      const sessionNumber = (lastSession?.sessionNumber ?? 0) + 1;

      // Generate slug if not provided
      const slug = input.slug || generateSlug(input.title);

      // Check if slug is unique
      if (slug) {
        const slugExists = await db.session.findUnique({
          where: { slug },
        });
        if (slugExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "رابط الحدث موجود مسبقاً",
          });
        }
      }

      const session = await db.session.create({
        data: {
          ...sessionData,
          sessionNumber,
          slug: slug || null,
        },
      });

      return session;
    }),

  /**
   * Update session (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        sessionNumber: z.number().int().positive().optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        date: z.date().optional(),
        guestName: z.string().optional(),
        guestProfile: z.string().optional(),
        maxParticipants: z.number().int().positive().optional(),
        maxCompanions: z.number().int().min(0).optional(),
        status: z.enum(["open", "closed", "completed"]).optional(),
        visibilityStatus: z.enum(["inactive", "active", "archived"]).optional(),
        requiresApproval: z.boolean().optional(),
        showParticipantCount: z.boolean().optional(),
        location: z.string().optional(),
        registrationDeadline: z.date().nullable().optional(),
        showCountdown: z.boolean().optional(),
        showGuestProfile: z.boolean().optional(),
        enableMiniView: z.boolean().optional(),
        customConfirmationMessage: z.string().optional(),
        embedEnabled: z.boolean().optional(),
        slug: z.string().optional(),
        inviteOnly: z.boolean().optional(),
        inviteMessage: z.string().optional(),
        sendQrInEmail: z.boolean().optional(),
        showSocialMediaFields: z.boolean().optional(),
        showRegistrationPurpose: z.boolean().optional(),
        showCateringInterest: z.boolean().optional(),
        locationUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { id, ...data } = input;

      // Check if session exists
      const existing = await db.session.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      // Check session number uniqueness if changing
      if (data.sessionNumber && data.sessionNumber !== existing.sessionNumber) {
        const numberExists = await db.session.findUnique({
          where: { sessionNumber: data.sessionNumber },
        });
        if (numberExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "رقم الحدث موجود مسبقاً",
          });
        }
      }

      // Check slug uniqueness if changing
      if (data.slug && data.slug !== existing.slug) {
        const slugExists = await db.session.findUnique({
          where: { slug: data.slug },
        });
        if (slugExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "رابط الحدث موجود مسبقاً",
          });
        }
      }

      const session = await db.session.update({
        where: { id },
        data,
      });

      // If registration deadline changed, update invite expirations
      if (
        data.registrationDeadline !== undefined &&
        data.registrationDeadline !== existing.registrationDeadline
      ) {
        const newExpiresAt = data.registrationDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Update all unused invites for this session
        await db.invite.updateMany({
          where: {
            sessionId: id,
            used: false,
          },
          data: {
            expiresAt: newExpiresAt,
          },
        });
      }

      return session;
    }),

  /**
   * Get countdown data for session (public - only for active/published sessions)
   */
  getCountdown: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const session = await db.session.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          title: true,
          date: true,
          showCountdown: true,
          visibilityStatus: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      // Only return countdown for active (published) sessions
      if (session.visibilityStatus !== "active") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      if (!session.showCountdown) {
        return null;
      }

      const now = new Date();
      const targetDate = new Date(session.date);
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        return {
          id: session.id,
          title: session.title,
          date: session.date,
          expired: true,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        };
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return {
        id: session.id,
        title: session.title,
        date: session.date,
        expired: false,
        days,
        hours,
        minutes,
        seconds,
      };
    }),

  /**
   * Get embed code for session (admin only)
   */
  getEmbedCode: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const session = await db.session.findUnique({
        where: { id: input.id },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      if (!session.embedEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التضمين غير مفعل لهذا الحدث",
        });
      }

      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      const embedUrl = `${baseUrl}/event/${session.slug || session.id}/embed`;
      const miniUrl = session.enableMiniView
        ? `${baseUrl}/event/${session.slug || session.id}/embed?mini=true`
        : null;

      const standardCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`;
      const miniCode = miniUrl
        ? `<iframe src="${miniUrl}" width="300" height="400" frameborder="0"></iframe>`
        : null;

      return {
        embedUrl,
        miniUrl,
        standardCode,
        miniCode,
      };
    }),

  /**
   * Check if user is registered for session
   */
  checkRegistration: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      const registration = await db.registration.findFirst({
        where: {
          sessionId: input.sessionId,
          userId: session.user.id,
        },
        include: {
          invitedRegistrations: true,
        },
      });

      if (!registration) {
        return { registered: false };
      }

      return {
        registered: true,
        registration: {
          id: registration.id,
          isApproved: registration.isApproved,
          registeredAt: registration.registeredAt,
          companionCount: registration.invitedRegistrations.length,
        },
      };
    }),

  /**
   * Update visibility status (admin only) - quick action
   */
  updateVisibility: adminProcedure
    .input(
      z.object({
        id: z.string(),
        visibilityStatus: z.enum(["inactive", "active", "archived"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const session = await db.session.findUnique({
        where: { id: input.id },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      return db.session.update({
        where: { id: input.id },
        data: { visibilityStatus: input.visibilityStatus },
      });
    }),

  /**
   * List all sessions for admin (includes all visibility statuses)
   */
  listAdmin: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["open", "closed", "completed"]).optional(),
          visibilityStatus: z.enum(["inactive", "active", "archived"]).optional(),
          dateRange: z.enum(["today", "week", "month", "all"]).optional(),
          sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
          limit: z.number().min(1).max(100).optional().default(50),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      if (input?.status) {
        where.status = input.status;
      }

      if (input?.visibilityStatus) {
        where.visibilityStatus = input.visibilityStatus;
      }

      // Date range filtering (using Saudi Arabia timezone)
      if (input?.dateRange && input.dateRange !== "all") {
        if (input.dateRange === "today") {
          where.date = {
            gte: startOfDayInSaudi(),
            lte: endOfDayInSaudi(),
          };
        } else if (input.dateRange === "week") {
          where.date = {
            gte: startOfWeekInSaudi(),
            lte: endOfWeekInSaudi(),
          };
        } else if (input.dateRange === "month") {
          where.date = {
            gte: startOfMonthInSaudi(),
            lte: endOfMonthInSaudi(),
          };
        }
      }

      const sortOrder = input?.sortOrder ?? "desc";

      const sessions = await db.session.findMany({
        where,
        orderBy: { date: sortOrder },
        take: (input?.limit ?? 50) + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        include: {
          _count: {
            select: { registrations: { where: { isApproved: true } } },
          },
        },
      });

      let nextCursor: string | undefined;
      if (sessions.length > (input?.limit ?? 50)) {
        const nextItem = sessions.pop();
        nextCursor = nextItem?.id;
      }

      return {
        sessions: sessions.map((s) => ({
          ...s,
          registrationCount: s._count.registrations,
          isFull: s._count.registrations >= s.maxParticipants,
        })),
        nextCursor,
      };
    }),

  /**
   * Delete session (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const session = await db.session.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { registrations: true },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      // Soft delete - mark as deleted instead of hard delete
      // Or you can cascade delete registrations, attendances, invites
      await db.$transaction([
        db.attendance.deleteMany({ where: { sessionId: input.id } }),
        db.invite.deleteMany({ where: { sessionId: input.id } }),
        db.registration.deleteMany({ where: { sessionId: input.id } }),
        db.session.delete({ where: { id: input.id } }),
      ]);

      return { success: true };
    }),
});
