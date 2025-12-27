import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../trpc";
import { arabicSearchOr } from "@/lib/search";
import { deleteImage, extractKeyFromUrl } from "@/lib/s3";

export const guestRouter = createTRPCRouter({
  /**
   * Get all guests (admin only)
   */
  getAll: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          isPublic: z.boolean().optional(),
          isActive: z.boolean().optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      if (input?.search) {
        // Use raw SQL for Arabic-aware search
        const matchingIds = await db.$queryRaw<{ id: string }[]>`
          SELECT DISTINCT g."id"
          FROM "Guest" g
          WHERE ${arabicSearchOr(
            ['g."name"', 'g."company"', 'g."jobTitle"'],
            input.search
          )}
        `;
        where.id = { in: matchingIds.map((m) => m.id) };
      }

      if (input?.isPublic !== undefined) {
        where.isPublic = input.isPublic;
      }

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      } else {
        // By default, only show active guests
        where.isActive = true;
      }

      const guests = await db.guest.findMany({
        where,
        take: (input?.limit ?? 50) + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          sessionGuests: {
            select: {
              id: true,
              sessionId: true,
              displayOrder: true,
              session: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                  visibilityStatus: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: {
              sessionGuests: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (guests.length > (input?.limit ?? 50)) {
        const nextItem = guests.pop();
        nextCursor = nextItem?.id;
      }

      return {
        guests,
        nextCursor,
      };
    }),

  /**
   * Get guest insights for dashboard (admin only)
   */
  getInsights: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const [total, publicCount, privateCount] = await Promise.all([
      db.guest.count({ where: { isActive: true } }),
      db.guest.count({ where: { isActive: true, isPublic: true } }),
      db.guest.count({ where: { isActive: true, isPublic: false } }),
    ]);

    return {
      total,
      public: publicCount,
      private: privateCount,
    };
  }),

  /**
   * Get guest by ID (admin only)
   */
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const guest = await db.guest.findUnique({
        where: { id: input.id },
        include: {
          sessionGuests: {
            include: {
              session: {
                select: {
                  id: true,
                  title: true,
                  sessionNumber: true,
                  date: true,
                  status: true,
                  visibilityStatus: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!guest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الضيف غير موجود",
        });
      }

      return guest;
    }),

  /**
   * Get public guest profile
   */
  getPublic: publicProcedure
    .input(
      z.object({
        id: z.string(),
        adminPreview: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const guest = await db.guest.findUnique({
        where: { id: input.id, isActive: true },
        include: {
          sessionGuests: {
            where: {
              session: {
                visibilityStatus: "active",
              },
            },
            include: {
              session: {
                select: {
                  id: true,
                  title: true,
                  sessionNumber: true,
                  date: true,
                  slug: true,
                },
              },
            },
            orderBy: {
              session: {
                date: "desc",
              },
            },
          },
        },
      });

      if (!guest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الضيف غير موجود",
        });
      }

      // Only allow access if public or admin preview
      if (!guest.isPublic && !input.adminPreview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الضيف غير موجود",
        });
      }

      return {
        ...guest,
        isPreview: input.adminPreview && !guest.isPublic,
      };
    }),

  /**
   * Create a new guest (admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "الاسم مطلوب"),
        title: z.string().optional().nullable(),
        jobTitle: z.string().optional().nullable(),
        company: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        imageUrl: z.string().optional().nullable(),
        socialMediaLinks: z.record(z.string(), z.string()).optional().nullable(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const guest = await db.guest.create({
        data: {
          name: input.name,
          title: input.title || null,
          jobTitle: input.jobTitle || null,
          company: input.company || null,
          description: input.description || null,
          imageUrl: input.imageUrl || null,
          socialMediaLinks: input.socialMediaLinks
            ? (input.socialMediaLinks as Prisma.InputJsonValue)
            : Prisma.DbNull,
          isPublic: input.isPublic,
          isActive: true,
        },
      });

      return guest;
    }),

  /**
   * Quick create a guest with just name (for session form)
   */
  quickCreate: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "الاسم مطلوب"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const guest = await db.guest.create({
        data: {
          name: input.name,
          isPublic: false,
          isActive: true,
        },
      });

      return guest;
    }),

  /**
   * Update a guest (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "الاسم مطلوب").optional(),
        title: z.string().optional().nullable(),
        jobTitle: z.string().optional().nullable(),
        company: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        imageUrl: z.string().optional().nullable(),
        socialMediaLinks: z.record(z.string(), z.string()).optional().nullable(),
        isPublic: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { id, ...data } = input;

      const existing = await db.guest.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الضيف غير موجود",
        });
      }

      // If image is being changed and old one exists, delete old image
      if (
        data.imageUrl !== undefined &&
        existing.imageUrl &&
        data.imageUrl !== existing.imageUrl
      ) {
        try {
          const key = extractKeyFromUrl(existing.imageUrl);
          if (key) {
            await deleteImage(key);
          }
        } catch (error) {
          console.error("Failed to delete old guest image:", error);
        }
      }

      const guest = await db.guest.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.title !== undefined && { title: data.title || null }),
          ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle || null }),
          ...(data.company !== undefined && { company: data.company || null }),
          ...(data.description !== undefined && { description: data.description || null }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
          ...(data.socialMediaLinks !== undefined && {
            socialMediaLinks: data.socialMediaLinks
              ? (data.socialMediaLinks as Prisma.InputJsonValue)
              : Prisma.DbNull,
          }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      return guest;
    }),

  /**
   * Update social media links (admin only)
   */
  updateSocialMedia: adminProcedure
    .input(
      z.object({
        id: z.string(),
        socialMediaLinks: z.record(z.string(), z.string()).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const existing = await db.guest.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الضيف غير موجود",
        });
      }

      const guest = await db.guest.update({
        where: { id: input.id },
        data: {
          socialMediaLinks: input.socialMediaLinks
            ? (input.socialMediaLinks as Prisma.InputJsonValue)
            : Prisma.DbNull,
        },
      });

      return guest;
    }),

  /**
   * Get guests for a session (public)
   */
  getSessionGuests: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const sessionGuests = await db.sessionGuest.findMany({
        where: { sessionId: input.sessionId },
        include: {
          guest: {
            select: {
              id: true,
              name: true,
              title: true,
              jobTitle: true,
              company: true,
              imageUrl: true,
              isPublic: true,
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      });

      return sessionGuests.map((sg) => ({
        ...sg.guest,
        displayOrder: sg.displayOrder,
      }));
    }),

  /**
   * Link guest to session (admin only)
   */
  linkToSession: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        guestId: z.string(),
        displayOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify guest exists
      const guest = await db.guest.findUnique({
        where: { id: input.guestId },
      });

      if (!guest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الضيف غير موجود",
        });
      }

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

      // Check if already linked
      const existing = await db.sessionGuest.findUnique({
        where: {
          sessionId_guestId: {
            sessionId: input.sessionId,
            guestId: input.guestId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "الضيف مرتبط بالحدث بالفعل",
        });
      }

      // Get next display order if not provided
      let displayOrder = input.displayOrder;
      if (displayOrder === 0) {
        const maxOrder = await db.sessionGuest.findFirst({
          where: { sessionId: input.sessionId },
          orderBy: { displayOrder: "desc" },
          select: { displayOrder: true },
        });
        displayOrder = (maxOrder?.displayOrder ?? 0) + 1;
      }

      const sessionGuest = await db.sessionGuest.create({
        data: {
          sessionId: input.sessionId,
          guestId: input.guestId,
          displayOrder,
        },
        include: {
          guest: true,
          session: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return sessionGuest;
    }),

  /**
   * Unlink guest from session (admin only)
   */
  unlinkFromSession: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        guestId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const existing = await db.sessionGuest.findUnique({
        where: {
          sessionId_guestId: {
            sessionId: input.sessionId,
            guestId: input.guestId,
          },
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الربط غير موجود",
        });
      }

      await db.sessionGuest.delete({
        where: { id: existing.id },
      });

      return { success: true };
    }),

  /**
   * Update display order for guests in a session (admin only)
   */
  updateDisplayOrder: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        orderedGuestIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Update display order for each guest
      await Promise.all(
        input.orderedGuestIds.map((guestId, index) =>
          db.sessionGuest.updateMany({
            where: {
              sessionId: input.sessionId,
              guestId,
            },
            data: {
              displayOrder: index,
            },
          })
        )
      );

      return { success: true };
    }),

  /**
   * Search guests for selector (admin only)
   */
  searchForSelector: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        excludeIds: z.array(z.string()).optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        isActive: true,
      };

      if (input.search) {
        const matchingIds = await db.$queryRaw<{ id: string }[]>`
          SELECT DISTINCT g."id"
          FROM "Guest" g
          WHERE ${arabicSearchOr(['g."name"'], input.search)}
        `;
        where.id = { in: matchingIds.map((m) => m.id) };
      }

      if (input.excludeIds && input.excludeIds.length > 0) {
        if (where.id) {
          // Filter out excluded IDs from matching IDs
          where.id.in = where.id.in.filter(
            (id: string) => !input.excludeIds!.includes(id)
          );
        } else {
          where.id = { notIn: input.excludeIds };
        }
      }

      const guests = await db.guest.findMany({
        where,
        take: input.limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          title: true,
          jobTitle: true,
          company: true,
          imageUrl: true,
        },
      });

      return guests;
    }),

  /**
   * Bulk link guests to session (admin only) - used by session form
   */
  setSessionGuests: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        guestIds: z.array(z.string()),
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

      // Delete all existing session guests
      await db.sessionGuest.deleteMany({
        where: { sessionId: input.sessionId },
      });

      // Create new session guests with display order
      if (input.guestIds.length > 0) {
        await db.sessionGuest.createMany({
          data: input.guestIds.map((guestId, index) => ({
            sessionId: input.sessionId,
            guestId,
            displayOrder: index,
          })),
        });
      }

      return { success: true };
    }),
});
