import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import { generateSlug } from "@/lib/utils";

export const sessionRouter = createTRPCRouter({
  /**
   * List all sessions with optional filters
   */
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(["open", "closed", "completed"]).optional(),
        upcoming: z.boolean().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      if (input?.status) {
        where.status = input.status;
      }

      if (input?.upcoming) {
        where.date = { gt: new Date() };
        where.status = "open";
      }

      const sessions = await db.session.findMany({
        where,
        orderBy: { date: "desc" },
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
   * Get upcoming open sessions
   */
  getUpcoming: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(10).optional().default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const sessions = await db.session.findMany({
        where: {
          date: { gt: new Date() },
          status: "open",
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
        registrationCount: s.showParticipantCount ? s._count.registrations : null,
        isFull: s._count.registrations >= s.maxParticipants,
        canRegister: s.status === "open" &&
          s._count.registrations < s.maxParticipants &&
          (!s.registrationDeadline || new Date() < s.registrationDeadline),
      }));
    }),

  /**
   * Get session by ID
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
          message: "الجلسة غير موجودة",
        });
      }

      return {
        ...session,
        registrationCount: session.showParticipantCount ? session._count.registrations : null,
        isFull: session._count.registrations >= session.maxParticipants,
        canRegister: session.status === "open" &&
          session._count.registrations < session.maxParticipants &&
          (!session.registrationDeadline || new Date() < session.registrationDeadline),
      };
    }),

  /**
   * Get session by slug
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
          message: "الجلسة غير موجودة",
        });
      }

      return {
        ...session,
        registrationCount: session.showParticipantCount ? session._count.registrations : null,
        isFull: session._count.registrations >= session.maxParticipants,
        canRegister: session.status === "open" &&
          session._count.registrations < session.maxParticipants &&
          (!session.registrationDeadline || new Date() < session.registrationDeadline),
      };
    }),

  /**
   * Create new session (admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        sessionNumber: z.number().int().positive(),
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Check if session number already exists
      const existing = await db.session.findUnique({
        where: { sessionNumber: input.sessionNumber },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "رقم الجلسة موجود مسبقاً",
        });
      }

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
            message: "رابط الجلسة موجود مسبقاً",
          });
        }
      }

      const session = await db.session.create({
        data: {
          ...input,
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
          message: "الجلسة غير موجودة",
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
            message: "رقم الجلسة موجود مسبقاً",
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
            message: "رابط الجلسة موجود مسبقاً",
          });
        }
      }

      const session = await db.session.update({
        where: { id },
        data,
      });

      return session;
    }),

  /**
   * Get countdown data for session
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
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الجلسة غير موجودة",
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
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
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
          message: "الجلسة غير موجودة",
        });
      }

      if (!session.embedEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التضمين غير مفعل لهذه الجلسة",
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
          companions: true,
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
          companionCount: registration.companions.length,
        },
      };
    }),
});
