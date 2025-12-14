import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
} from "../trpc";
import { getSponsorshipTypeLabel, getSponsorTypeLabel } from "@/lib/constants";
import { exportToCSV } from "@/lib/utils";
import { toSaudiTime } from "@/lib/timezone";

export const sponsorRouter = createTRPCRouter({
  /**
   * Get all sponsors (admin only)
   */
  getAll: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        type: z.enum(["person", "company"]).optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      if (input?.search) {
        where.OR = [
          { name: { contains: input.search } },
          { email: { contains: input.search } },
          { phone: { contains: input.search } },
        ];
      }

      if (input?.type) {
        where.type = input.type;
      }

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      } else {
        // By default, only show active sponsors
        where.isActive = true;
      }

      const sponsors = await db.sponsor.findMany({
        where,
        take: (input?.limit ?? 50) + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          eventSponsorships: {
            select: {
              id: true,
              sessionId: true,
              sponsorshipType: true,
              session: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                },
              },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (sponsors.length > (input?.limit ?? 50)) {
        const nextItem = sponsors.pop();
        nextCursor = nextItem?.id;
      }

      return {
        sponsors,
        nextCursor,
      };
    }),

  /**
   * Get sponsor by ID (admin only)
   */
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const sponsor = await db.sponsor.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          eventSponsorships: {
            include: {
              session: {
                select: {
                  id: true,
                  title: true,
                  sessionNumber: true,
                  date: true,
                  status: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!sponsor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الراعي غير موجود",
        });
      }

      return sponsor;
    }),

  /**
   * Get sponsors by user ID (admin or user themselves) - returns array since multiple sponsors can be linked to one user
   */
  getByUserId: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const sponsors = await db.sponsor.findMany({
        where: { userId: input.userId, isActive: true },
        include: {
          eventSponsorships: {
            include: {
              session: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                },
              },
            },
          },
        },
      });

      return sponsors;
    }),

  /**
   * Create a new sponsor (admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "الاسم مطلوب"),
        email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable(),
        phone: z.string().optional().nullable(),
        type: z.enum(["person", "company"]).default("person"),
        logoUrl: z.string().optional().nullable(),
        sponsorshipTypes: z.array(z.string()).default([]),
        sponsorshipOtherText: z.string().optional().nullable(),
        userId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify user exists if linking to a user
      if (input.userId) {
        const user = await db.user.findUnique({
          where: { id: input.userId },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المستخدم غير موجود",
          });
        }
      }

      const sponsor = await db.sponsor.create({
        data: {
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          type: input.type,
          logoUrl: input.logoUrl || null,
          sponsorshipTypes: input.sponsorshipTypes,
          sponsorshipOtherText: input.sponsorshipOtherText || null,
          userId: input.userId || null,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return sponsor;
    }),

  /**
   * Update a sponsor (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "الاسم مطلوب").optional(),
        email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable(),
        phone: z.string().optional().nullable(),
        type: z.enum(["person", "company"]).optional(),
        logoUrl: z.string().optional().nullable(),
        sponsorshipTypes: z.array(z.string()).optional(),
        sponsorshipOtherText: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { id, ...data } = input;

      const existing = await db.sponsor.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الراعي غير موجود",
        });
      }

      const sponsor = await db.sponsor.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return sponsor;
    }),

  /**
   * Delete a sponsor (soft delete - set isActive to false)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const existing = await db.sponsor.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الراعي غير موجود",
        });
      }

      await db.sponsor.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return { success: true };
    }),

  /**
   * Hard delete a sponsor (admin only - removes from database)
   */
  hardDelete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const existing = await db.sponsor.findUnique({
        where: { id: input.id },
        include: {
          eventSponsorships: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الراعي غير موجود",
        });
      }

      // First delete related event sponsorships
      if (existing.eventSponsorships.length > 0) {
        await db.eventSponsorship.deleteMany({
          where: { sponsorId: input.id },
        });
      }

      await db.sponsor.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Get event sponsorships for a session (public - for session detail page)
   */
  getSessionSponsorships: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const sponsorships = await db.eventSponsorship.findMany({
        where: { sessionId: input.sessionId },
        include: {
          sponsor: {
            select: {
              id: true,
              name: true,
              type: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return sponsorships;
    }),

  /**
   * Get event sponsorships for a session with full details (admin only)
   */
  getSessionSponsorshipsAdmin: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const session = await db.session.findUnique({
        where: { id: input.sessionId },
        select: { id: true, title: true, date: true },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      const sponsorships = await db.eventSponsorship.findMany({
        where: { sessionId: input.sessionId },
        include: {
          sponsor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              type: true,
              logoUrl: true,
              sponsorshipTypes: true,
              sponsorshipOtherText: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        session,
        sponsorships,
      };
    }),

  /**
   * Link a sponsor to a session (create EventSponsorship)
   */
  linkToSession: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        sponsorId: z.string().optional().nullable(),
        sponsorshipType: z.string().min(1, "نوع الرعاية مطلوب"),
        isSelfSponsored: z.boolean().default(false),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify session exists
      const session = await db.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      // Verify sponsor exists if provided
      if (input.sponsorId) {
        const sponsor = await db.sponsor.findUnique({
          where: { id: input.sponsorId },
        });

        if (!sponsor) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "الراعي غير موجود",
          });
        }
      }

      const sponsorship = await db.eventSponsorship.create({
        data: {
          sessionId: input.sessionId,
          sponsorId: input.sponsorId || null,
          sponsorshipType: input.sponsorshipType,
          isSelfSponsored: input.isSelfSponsored,
          notes: input.notes || null,
        },
        include: {
          sponsor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              type: true,
              logoUrl: true,
            },
          },
          session: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return sponsorship;
    }),

  /**
   * Update an event sponsorship
   */
  updateSponsorship: adminProcedure
    .input(
      z.object({
        id: z.string(),
        sponsorId: z.string().optional().nullable(),
        sponsorshipType: z.string().min(1).optional(),
        isSelfSponsored: z.boolean().optional(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { id, ...data } = input;

      const existing = await db.eventSponsorship.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "سجل الرعاية غير موجود",
        });
      }

      // Verify new sponsor exists if provided
      if (data.sponsorId) {
        const sponsor = await db.sponsor.findUnique({
          where: { id: data.sponsorId },
        });

        if (!sponsor) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "الراعي غير موجود",
          });
        }
      }

      const sponsorship = await db.eventSponsorship.update({
        where: { id },
        data,
        include: {
          sponsor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              type: true,
              logoUrl: true,
            },
          },
        },
      });

      return sponsorship;
    }),

  /**
   * Unlink a sponsor from a session (delete EventSponsorship)
   */
  unlinkFromSession: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const existing = await db.eventSponsorship.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "سجل الرعاية غير موجود",
        });
      }

      await db.eventSponsorship.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Export sponsors to CSV (admin only)
   */
  export: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const sponsors = await db.sponsor.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        eventSponsorships: {
          include: {
            session: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = sponsors.map((s) => ({
      الاسم: s.name,
      البريد: s.email || "",
      الهاتف: s.phone || "",
      النوع: getSponsorTypeLabel(s.type),
      "أنواع الرعاية": s.sponsorshipTypes.map(getSponsorshipTypeLabel).join(", "),
      "تفاصيل أخرى": s.sponsorshipOtherText || "",
      "مرتبط بمستخدم": s.user ? "نعم" : "لا",
      "عدد الرعايات": s.eventSponsorships.length,
      "الفعاليات": s.eventSponsorships.map((e) => e.session.title).join(", "),
      "تاريخ الإنشاء": toSaudiTime(s.createdAt)?.toLocaleDateString("ar-SA", { numberingSystem: "latn" }) ?? "",
    }));

    const csv = exportToCSV(data);
    return { csv, count: sponsors.length };
  }),

  /**
   * Get available sessions for linking a sponsor to (dropdown list)
   */
  getAvailableSessions: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sponsorId: z.string().optional(), // To exclude sessions already linked
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get sessions that the sponsor is already linked to (if sponsorId provided)
      let excludeSessionIds: string[] = [];
      if (input.sponsorId) {
        const existingSponsorships = await db.eventSponsorship.findMany({
          where: { sponsorId: input.sponsorId },
          select: { sessionId: true },
        });
        excludeSessionIds = existingSponsorships.map((es) => es.sessionId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      // Exclude already-linked sessions
      if (excludeSessionIds.length > 0) {
        where.id = { notIn: excludeSessionIds };
      }

      // Search by title or session number
      if (input.search) {
        const searchNum = parseInt(input.search);
        if (!isNaN(searchNum)) {
          where.OR = [
            { title: { contains: input.search } },
            { sessionNumber: searchNum },
          ];
        } else {
          where.title = { contains: input.search };
        }
      }

      const sessions = await db.session.findMany({
        where,
        select: {
          id: true,
          title: true,
          sessionNumber: true,
          date: true,
          status: true,
        },
        take: input.limit,
        orderBy: { date: "desc" },
      });

      return sessions;
    }),

  /**
   * Get available sponsors for linking to session (dropdown list)
   */
  getAvailableForSession: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sponsorshipType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        isActive: true,
      };

      if (input.search) {
        where.OR = [
          { name: { contains: input.search } },
          { email: { contains: input.search } },
          { phone: { contains: input.search } },
        ];
      }

      if (input.sponsorshipType) {
        where.sponsorshipTypes = { has: input.sponsorshipType };
      }

      const sponsors = await db.sponsor.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          type: true,
          logoUrl: true,
          sponsorshipTypes: true,
          sponsorshipOtherText: true,
        },
        take: input.limit,
        orderBy: { name: "asc" },
      });

      return sponsors;
    }),

  /**
   * Link a sponsor to a user (admin only)
   */
  linkToUser: adminProcedure
    .input(
      z.object({
        sponsorId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify sponsor exists
      const sponsor = await db.sponsor.findUnique({
        where: { id: input.sponsorId },
      });

      if (!sponsor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الراعي غير موجود",
        });
      }

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

      // Update sponsor with user link
      const updatedSponsor = await db.sponsor.update({
        where: { id: input.sponsorId },
        data: { userId: input.userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      });

      return updatedSponsor;
    }),

  /**
   * Unlink a sponsor from a user (admin only)
   */
  unlinkFromUser: adminProcedure
    .input(z.object({ sponsorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify sponsor exists
      const sponsor = await db.sponsor.findUnique({
        where: { id: input.sponsorId },
      });

      if (!sponsor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الراعي غير موجود",
        });
      }

      if (!sponsor.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "هذا الراعي غير مرتبط بأي مستخدم",
        });
      }

      // Update sponsor to remove user link
      const updatedSponsor = await db.sponsor.update({
        where: { id: input.sponsorId },
        data: { userId: null },
      });

      return updatedSponsor;
    }),

  /**
   * Search users for linking to a sponsor (admin only)
   */
  searchUsersForLinking: adminProcedure
    .input(
      z.object({
        search: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const users = await db.user.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
            { phone: { contains: input.search } },
            { username: { contains: input.search, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          companyName: true,
          _count: {
            select: { sponsors: true },
          },
        },
        take: input.limit,
        orderBy: { name: "asc" },
      });

      return users.map((u) => ({
        ...u,
        sponsorCount: u._count.sponsors,
        _count: undefined,
      }));
    }),
});
