import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
} from "../trpc";
import { getSponsorshipTypeLabel, getSponsorTypeLabel, getSponsorStatusLabel } from "@/lib/constants";
import { exportToCSV } from "@/lib/utils";
import { toSaudiTime } from "@/lib/timezone";
import { normalizeArabic } from "@/lib/search";

export const sponsorRouter = createTRPCRouter({
  /**
   * Get all sponsors (admin only)
   */
  getAll: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        type: z.enum(["person", "company"]).optional(),
        status: z.enum(["new", "contacted", "sponsored", "interested_again", "interested_permanent"]).optional(),
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
        const normalizedSearch = normalizeArabic(input.search);
        where.OR = [
          { name: { contains: normalizedSearch, mode: "insensitive" } },
          { email: { contains: normalizedSearch, mode: "insensitive" } },
          { phone: { contains: normalizedSearch, mode: "insensitive" } },
          // Search by linked user's name
          { user: { name: { contains: normalizedSearch, mode: "insensitive" } } },
        ];
      }

      if (input?.type) {
        where.type = input.type;
      }

      if (input?.status) {
        where.status = input.status;
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
              createdAt: true,
              session: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          labels: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          _count: {
            select: {
              notes: true,
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
   * Get sponsor insights for dashboard (admin only)
   */
  getSponsorInsights: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    // Get all active sponsors with their sponsorships
    const sponsors = await db.sponsor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        type: true,
        status: true,
        updatedAt: true,
        eventSponsorships: {
          select: {
            id: true,
            createdAt: true,
            session: {
              select: {
                date: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Calculate insights
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let totalCompanies = 0;
    let totalPersons = 0;
    let activeSponsors = 0;
    let needsFollowUp = 0;
    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      sponsored: 0,
      interested_again: 0,
      interested_permanent: 0,
    };

    for (const sponsor of sponsors) {
      // Count by type
      if (sponsor.type === "company") {
        totalCompanies++;
      } else {
        totalPersons++;
      }

      // Count by status
      if (sponsor.status && statusCounts[sponsor.status] !== undefined) {
        statusCounts[sponsor.status]++;
      }

      // Check if active (sponsored in last 3 months)
      const lastSponsorship = sponsor.eventSponsorships[0];
      if (lastSponsorship && new Date(lastSponsorship.createdAt) >= threeMonthsAgo) {
        activeSponsors++;
      }

      // Check if needs follow-up (contacted status for 7+ days without sponsorship)
      if (
        sponsor.status === "contacted" &&
        new Date(sponsor.updatedAt) <= sevenDaysAgo &&
        (!lastSponsorship || new Date(lastSponsorship.createdAt) < new Date(sponsor.updatedAt))
      ) {
        needsFollowUp++;
      }
    }

    // Get upcoming sessions coverage
    const upcomingSessions = await db.session.findMany({
      where: {
        date: { gte: now },
        visibilityStatus: { not: "archived" },
      },
      include: {
        eventSponsorships: {
          select: {
            sponsorshipType: true,
          },
        },
      },
      take: 10,
    });

    let fullySponsored = 0;
    let partiallySponsored = 0;
    let noSponsorship = 0;

    for (const session of upcomingSessions) {
      const types = new Set(session.eventSponsorships.map((s) => s.sponsorshipType));
      const hasDinner = types.has("dinner");
      const hasBeverage = types.has("beverage");
      const hasDessert = types.has("dessert");

      if (hasDinner && hasBeverage && hasDessert) {
        fullySponsored++;
      } else if (types.size > 0) {
        partiallySponsored++;
      } else {
        noSponsorship++;
      }
    }

    return {
      totalSponsors: sponsors.length,
      totalCompanies,
      totalPersons,
      activeSponsors,
      needsFollowUp,
      statusCounts,
      upcomingSessions: {
        total: upcomingSessions.length,
        fullySponsored,
        partiallySponsored,
        noSponsorship,
      },
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
          labels: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          _count: {
            select: {
              notes: true,
            },
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
        status: z.enum(["new", "contacted", "sponsored", "interested_again", "interested_permanent"]).default("new"),
        logoUrl: z.string().optional().nullable(),
        logoBackground: z.string().default("transparent"), // Can be preset value or custom hex color
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
          status: input.status,
          logoUrl: input.logoUrl || null,
          logoBackground: input.logoBackground,
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
        status: z.enum(["new", "contacted", "sponsored", "interested_again", "interested_permanent"]).optional(),
        logoUrl: z.string().optional().nullable(),
        logoBackground: z.string().optional(), // Can be preset value or custom hex color
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
              logoBackground: true,
            },
          },
        },
        orderBy: { displayOrder: "asc" },
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
        orderBy: { displayOrder: "asc" },
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

      // Get max displayOrder for this session to add new sponsorship at the end
      const maxOrder = await db.eventSponsorship.aggregate({
        where: { sessionId: input.sessionId },
        _max: { displayOrder: true },
      });
      const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

      const sponsorship = await db.eventSponsorship.create({
        data: {
          sessionId: input.sessionId,
          sponsorId: input.sponsorId || null,
          sponsorshipType: input.sponsorshipType,
          isSelfSponsored: input.isSelfSponsored,
          notes: input.notes || null,
          displayOrder: nextOrder,
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
   * Update display order for sponsorships (admin only)
   * Used for drag-and-drop or up/down reordering
   */
  updateDisplayOrder: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        orderedIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Update each sponsorship with its new display order
      const updates = input.orderedIds.map((id, index) =>
        db.eventSponsorship.update({
          where: { id },
          data: { displayOrder: index },
        })
      );

      await Promise.all(updates);

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
      الحالة: getSponsorStatusLabel(s.status),
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
        const normalizedSearch = normalizeArabic(input.search);
        const searchNum = parseInt(input.search);
        if (!isNaN(searchNum)) {
          where.OR = [
            { title: { contains: normalizedSearch, mode: "insensitive" } },
            { sessionNumber: searchNum },
          ];
        } else {
          where.title = { contains: normalizedSearch, mode: "insensitive" };
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
        const normalizedSearch = normalizeArabic(input.search);
        where.OR = [
          { name: { contains: normalizedSearch, mode: "insensitive" } },
          { email: { contains: normalizedSearch, mode: "insensitive" } },
          { phone: { contains: normalizedSearch, mode: "insensitive" } },
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
   * Quick update sponsor status (admin only)
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["new", "contacted", "sponsored", "interested_again", "interested_permanent"]),
      })
    )
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

      const sponsor = await db.sponsor.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      return sponsor;
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
      const normalizedSearch = normalizeArabic(input.search);

      const users = await db.user.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: normalizedSearch, mode: "insensitive" } },
            { email: { contains: normalizedSearch, mode: "insensitive" } },
            { phone: { contains: normalizedSearch, mode: "insensitive" } },
            { username: { contains: normalizedSearch, mode: "insensitive" } },
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

  // =====================
  // NOTES PROCEDURES
  // =====================

  /**
   * Get notes for a sponsor (admin only)
   */
  getNotes: adminProcedure
    .input(z.object({ sponsorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const notes = await db.sponsorNote.findMany({
        where: { sponsorId: input.sponsorId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return notes;
    }),

  /**
   * Add a note to a sponsor (admin only)
   */
  addNote: adminProcedure
    .input(
      z.object({
        sponsorId: z.string(),
        content: z.string().min(1, "محتوى الملاحظة مطلوب"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

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

      const note = await db.sponsorNote.create({
        data: {
          content: input.content,
          sponsorId: input.sponsorId,
          createdById: session.user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return note;
    }),

  /**
   * Delete a sponsor note (admin only)
   */
  deleteNote: adminProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const note = await db.sponsorNote.findUnique({
        where: { id: input.noteId },
      });

      if (!note) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الملاحظة غير موجودة",
        });
      }

      await db.sponsorNote.delete({
        where: { id: input.noteId },
      });

      return { success: true };
    }),

  // =====================
  // SOCIAL MEDIA PROCEDURES
  // =====================

  /**
   * Update sponsor social media links (admin only)
   */
  updateSocialMedia: adminProcedure
    .input(
      z.object({
        sponsorId: z.string(),
        socialMediaLinks: z.record(z.string(), z.string().url().or(z.literal(""))),
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

      // Filter out empty values
      const filteredLinks: Record<string, string> = {};
      for (const [key, value] of Object.entries(input.socialMediaLinks)) {
        if (value && value.trim()) {
          filteredLinks[key] = value.trim();
        }
      }

      const updatedSponsor = await db.sponsor.update({
        where: { id: input.sponsorId },
        data: {
          socialMediaLinks: Object.keys(filteredLinks).length > 0 ? filteredLinks : Prisma.JsonNull,
        },
      });

      return updatedSponsor;
    }),

  // =====================
  // LABELS PROCEDURES
  // =====================

  /**
   * Get all sponsor labels (admin only)
   */
  getLabels: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const labels = await db.sponsorLabel.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { sponsors: true },
        },
      },
    });

    return labels.map((l) => ({
      ...l,
      sponsorCount: l._count.sponsors,
      _count: undefined,
    }));
  }),

  /**
   * Create a sponsor label (admin only)
   */
  createLabel: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "اسم التصنيف مطلوب"),
        color: z.string().default("#6366f1"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Check if label name already exists
      const existing = await db.sponsorLabel.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "يوجد تصنيف بهذا الاسم بالفعل",
        });
      }

      const label = await db.sponsorLabel.create({
        data: {
          name: input.name,
          color: input.color,
        },
      });

      return label;
    }),

  /**
   * Update a sponsor label (admin only)
   */
  updateLabel: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "اسم التصنيف مطلوب").optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { id, ...data } = input;

      const existing = await db.sponsorLabel.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التصنيف غير موجود",
        });
      }

      // Check for name conflict if updating name
      if (data.name && data.name !== existing.name) {
        const nameConflict = await db.sponsorLabel.findUnique({
          where: { name: data.name },
        });

        if (nameConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "يوجد تصنيف بهذا الاسم بالفعل",
          });
        }
      }

      const label = await db.sponsorLabel.update({
        where: { id },
        data,
      });

      return label;
    }),

  /**
   * Delete a sponsor label (admin only)
   */
  deleteLabel: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const existing = await db.sponsorLabel.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التصنيف غير موجود",
        });
      }

      await db.sponsorLabel.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Add a label to a sponsor (admin only)
   */
  addLabelToSponsor: adminProcedure
    .input(
      z.object({
        sponsorId: z.string(),
        labelId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const sponsor = await db.sponsor.findUnique({
        where: { id: input.sponsorId },
      });

      if (!sponsor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الراعي غير موجود",
        });
      }

      const label = await db.sponsorLabel.findUnique({
        where: { id: input.labelId },
      });

      if (!label) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التصنيف غير موجود",
        });
      }

      await db.sponsor.update({
        where: { id: input.sponsorId },
        data: {
          labels: {
            connect: { id: input.labelId },
          },
        },
      });

      return { success: true };
    }),

  /**
   * Remove a label from a sponsor (admin only)
   */
  removeLabelFromSponsor: adminProcedure
    .input(
      z.object({
        sponsorId: z.string(),
        labelId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      await db.sponsor.update({
        where: { id: input.sponsorId },
        data: {
          labels: {
            disconnect: { id: input.labelId },
          },
        },
      });

      return { success: true };
    }),

  /**
   * Update sponsor labels (replace all) - admin only
   */
  updateSponsorLabels: adminProcedure
    .input(
      z.object({
        sponsorId: z.string(),
        labelIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const sponsor = await db.sponsor.findUnique({
        where: { id: input.sponsorId },
      });

      if (!sponsor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الراعي غير موجود",
        });
      }

      await db.sponsor.update({
        where: { id: input.sponsorId },
        data: {
          labels: {
            set: input.labelIds.map((id) => ({ id })),
          },
        },
      });

      return { success: true };
    }),

  // =====================
  // CALENDAR PROCEDURES
  // =====================

  /**
   * Get sponsorship calendar data (admin only)
   * Returns sessions with their sponsorship status for a date range
   */
  getSponsorshipCalendar: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const sessions = await db.session.findMany({
        where: {
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
          visibilityStatus: { not: "archived" },
        },
        include: {
          eventSponsorships: {
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
            orderBy: { displayOrder: "asc" },
          },
        },
        orderBy: { date: "asc" },
      });

      // Helper to find sponsorship by type
      const findByType = (
        sponsorships: typeof sessions[0]["eventSponsorships"],
        type: string
      ) => {
        const found = sponsorships.find((s) => s.sponsorshipType === type);
        if (!found) return null;
        return {
          id: found.id,
          sponsorId: found.sponsorId,
          sponsorName: found.sponsor?.name || null,
          sponsorLogoUrl: found.sponsor?.logoUrl || null,
          sponsorType: found.sponsor?.type || null,
          isSelfSponsored: found.isSelfSponsored,
          notes: found.notes,
        };
      };

      // Helper to filter sponsorships by type (for "other" which can have multiple)
      const filterByType = (
        sponsorships: typeof sessions[0]["eventSponsorships"],
        type: string
      ) => {
        return sponsorships
          .filter((s) => s.sponsorshipType === type)
          .map((found) => ({
            id: found.id,
            sponsorId: found.sponsorId,
            sponsorName: found.sponsor?.name || null,
            sponsorLogoUrl: found.sponsor?.logoUrl || null,
            sponsorType: found.sponsor?.type || null,
            isSelfSponsored: found.isSelfSponsored,
            notes: found.notes,
          }));
      };

      // Calculate completion rate (dinner, beverage, dessert = 3 main types)
      const calculateCompletion = (
        sponsorships: typeof sessions[0]["eventSponsorships"]
      ) => {
        const mainTypes = ["dinner", "beverage", "dessert"];
        const filled = mainTypes.filter((type) =>
          sponsorships.some((s) => s.sponsorshipType === type)
        ).length;
        return Math.round((filled / mainTypes.length) * 100);
      };

      const calendarSessions = sessions.map((session) => ({
        id: session.id,
        sessionNumber: session.sessionNumber,
        title: session.title,
        date: session.date,
        status: session.status,
        visibilityStatus: session.visibilityStatus,
        sponsorships: {
          dinner: findByType(session.eventSponsorships, "dinner"),
          beverage: findByType(session.eventSponsorships, "beverage"),
          dessert: findByType(session.eventSponsorships, "dessert"),
          other: filterByType(session.eventSponsorships, "other"),
        },
        completionRate: calculateCompletion(session.eventSponsorships),
      }));

      // Calculate stats
      const stats = {
        totalSessions: calendarSessions.length,
        fullySponsored: calendarSessions.filter((s) => s.completionRate === 100).length,
        partiallySponsored: calendarSessions.filter(
          (s) => s.completionRate > 0 && s.completionRate < 100
        ).length,
        noSponsorship: calendarSessions.filter((s) => s.completionRate === 0).length,
      };

      return {
        sessions: calendarSessions,
        stats,
      };
    }),

  /**
   * Get sponsorship stats for charts (admin only)
   * Returns aggregated data for sponsorship history visualization
   */
  getSponsorshipStats: adminProcedure
    .input(
      z.object({
        sessionCount: z.number().min(1).max(50).default(12),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get last N sessions with sponsorship data
      const sessions = await db.session.findMany({
        where: {
          visibilityStatus: { not: "archived" },
        },
        include: {
          eventSponsorships: {
            select: {
              sponsorshipType: true,
              isSelfSponsored: true,
            },
          },
        },
        orderBy: { date: "desc" },
        take: input?.sessionCount ?? 12,
      });

      // Reverse to show oldest first in charts
      const orderedSessions = sessions.reverse();

      // Build chart data
      const chartData = orderedSessions.map((session) => {
        const types = session.eventSponsorships.map((s) => s.sponsorshipType);
        return {
          sessionNumber: session.sessionNumber,
          title: session.title,
          date: session.date,
          dinner: types.includes("dinner") ? 1 : 0,
          beverage: types.includes("beverage") ? 1 : 0,
          dessert: types.includes("dessert") ? 1 : 0,
          other: types.filter((t) => t === "other").length,
          total: session.eventSponsorships.length,
          selfSponsored: session.eventSponsorships.filter((s) => s.isSelfSponsored).length,
        };
      });

      // Calculate totals
      const totals = {
        dinner: chartData.reduce((sum, s) => sum + s.dinner, 0),
        beverage: chartData.reduce((sum, s) => sum + s.beverage, 0),
        dessert: chartData.reduce((sum, s) => sum + s.dessert, 0),
        other: chartData.reduce((sum, s) => sum + s.other, 0),
        selfSponsored: chartData.reduce((sum, s) => sum + s.selfSponsored, 0),
      };

      return {
        chartData,
        totals,
      };
    }),
});
