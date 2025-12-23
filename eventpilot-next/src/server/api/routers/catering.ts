import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
} from "../trpc";
import { normalizeArabic } from "@/lib/search";

export const cateringRouter = createTRPCRouter({
  /**
   * Get catering info for public display (session details page)
   */
  getPublicSessionCatering: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const caterings = await db.eventCatering.findMany({
        where: { sessionId: input.sessionId },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return caterings;
    }),

  /**
   * Get all catering entries for a session (admin only)
   */
  getSessionCatering: adminProcedure
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

      const caterings = await db.eventCatering.findMany({
        where: { sessionId: input.sessionId },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        session,
        caterings,
      };
    }),

  /**
   * Add catering entry (assign host or mark self-catering)
   */
  addCatering: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        hostId: z.string().optional(),
        hostingType: z.string().min(1),
        isSelfCatering: z.boolean().default(false),
        notes: z.string().optional(),
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

      // Verify host exists if provided
      if (input.hostId) {
        const host = await db.user.findUnique({
          where: { id: input.hostId },
        });

        if (!host) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المضيف غير موجود",
          });
        }
      }

      const catering = await db.eventCatering.create({
        data: {
          sessionId: input.sessionId,
          hostId: input.hostId || null,
          hostingType: input.hostingType,
          isSelfCatering: input.isSelfCatering,
          notes: input.notes || null,
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      return catering;
    }),

  /**
   * Update catering entry
   */
  updateCatering: adminProcedure
    .input(
      z.object({
        id: z.string(),
        hostId: z.string().optional().nullable(),
        hostingType: z.string().min(1).optional(),
        isSelfCatering: z.boolean().optional(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { id, ...data } = input;

      const existing = await db.eventCatering.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "سجل الضيافة غير موجود",
        });
      }

      // Verify new host exists if provided
      if (data.hostId) {
        const host = await db.user.findUnique({
          where: { id: data.hostId },
        });

        if (!host) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المضيف غير موجود",
          });
        }
      }

      const catering = await db.eventCatering.update({
        where: { id },
        data,
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      return catering;
    }),

  /**
   * Delete catering entry
   */
  deleteCatering: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const existing = await db.eventCatering.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "سجل الضيافة غير موجود",
        });
      }

      await db.eventCatering.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Get potential hosts (users who want to host)
   */
  getPotentialHosts: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        hostingType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        isActive: true,
        OR: [
          { wantsToHost: true },
          // Also include users from registrations who want to host
        ],
      };

      if (input.search) {
        const normalizedSearch = normalizeArabic(input.search);
        where.AND = [
          {
            OR: [
              { name: { contains: normalizedSearch, mode: "insensitive" } },
              { email: { contains: normalizedSearch, mode: "insensitive" } },
              { phone: { contains: normalizedSearch, mode: "insensitive" } },
              { companyName: { contains: normalizedSearch, mode: "insensitive" } },
            ],
          },
        ];
      }

      if (input.hostingType) {
        where.hostingTypes = { has: input.hostingType };
      }

      const users = await db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          hostingTypes: true,
          wantsToHost: true,
        },
        take: input.limit,
        orderBy: { name: "asc" },
      });

      // Also get guests who want to host (from registrations)
      const normalizedSearchForGuests = input.search ? normalizeArabic(input.search) : "";
      const guestRegistrations = await db.registration.findMany({
        where: {
          guestWantsToHost: true,
          userId: null,
          ...(input.search
            ? {
                OR: [
                  { guestName: { contains: normalizedSearchForGuests, mode: "insensitive" } },
                  { guestEmail: { contains: normalizedSearchForGuests, mode: "insensitive" } },
                  { guestPhone: { contains: normalizedSearchForGuests, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(input.hostingType
            ? { guestHostingTypes: { has: input.hostingType } }
            : {}),
        },
        select: {
          id: true,
          guestName: true,
          guestEmail: true,
          guestPhone: true,
          guestCompanyName: true,
          guestHostingTypes: true,
        },
        take: input.limit,
      });

      // Combine and format results
      const potentialHosts = [
        ...users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          companyName: u.companyName,
          hostingTypes: u.hostingTypes,
          isGuest: false,
        })),
        ...guestRegistrations.map((r) => ({
          id: r.id,
          name: r.guestName,
          email: r.guestEmail,
          phone: r.guestPhone,
          companyName: r.guestCompanyName,
          hostingTypes: r.guestHostingTypes,
          isGuest: true,
        })),
      ];

      return potentialHosts;
    }),
});
