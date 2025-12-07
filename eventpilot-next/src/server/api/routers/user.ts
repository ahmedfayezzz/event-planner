import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";
import { formatPhoneNumber, validateSocialMediaUrl } from "@/lib/validation";

export const userRouter = createTRPCRouter({
  /**
   * Get user profile by username (public)
   */
  getProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const user = await db.user.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          name: true,
          username: true,
          companyName: true,
          position: true,
          activityType: true,
          instagram: true,
          snapchat: true,
          twitter: true,
          aiDescription: true,
          createdAt: true,
          _count: {
            select: {
              registrations: { where: { isApproved: true } },
            },
          },
        },
      });

      // Count attended events via registrations with attendance
      const attendedCount = await db.attendance.count({
        where: {
          registration: { userId: input.username },
          attended: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المستخدم غير موجود",
        });
      }

      return {
        ...user,
        registrationCount: user._count.registrations,
        attendanceCount: attendedCount,
      };
    }),

  /**
   * Get current user's profile (protected)
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const { db, session } = ctx;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        instagram: true,
        snapchat: true,
        twitter: true,
        companyName: true,
        position: true,
        activityType: true,
        gender: true,
        goal: true,
        aiDescription: true,
        isApproved: true,
        isActive: true,
        role: true,
        wantsToHost: true,
        hostingTypes: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "المستخدم غير موجود",
      });
    }

    return user;
  }),

  /**
   * Update current user's profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        phone: z.string().min(9).optional(),
        instagram: z.string().optional(),
        snapchat: z.string().optional(),
        twitter: z.string().optional(),
        companyName: z.string().optional(),
        position: z.string().optional(),
        activityType: z.string().optional(),
        gender: z.enum(["male", "female"]).optional(),
        goal: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Validate social media URLs
      if (input.instagram && !validateSocialMediaUrl(input.instagram, "instagram")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رابط Instagram غير صالح",
        });
      }

      if (input.snapchat && !validateSocialMediaUrl(input.snapchat, "snapchat")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رابط Snapchat غير صالح",
        });
      }

      if (input.twitter && !validateSocialMediaUrl(input.twitter, "twitter")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رابط Twitter غير صالح",
        });
      }

      // Format phone if provided
      const updateData: Record<string, unknown> = { ...input };
      if (input.phone) {
        updateData.phone = formatPhoneNumber(input.phone);

        // Check if phone is taken by another user
        const existingPhone = await db.user.findFirst({
          where: {
            phone: updateData.phone as string,
            id: { not: session.user.id },
          },
        });

        if (existingPhone) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "رقم الهاتف مستخدم من قبل مستخدم آخر",
          });
        }
      }

      const user = await db.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          instagram: true,
          snapchat: true,
          twitter: true,
          companyName: true,
          position: true,
          activityType: true,
          gender: true,
          goal: true,
        },
      });

      return user;
    }),

  /**
   * Get user dashboard data with registrations
   */
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const { db, session } = ctx;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        companyName: true,
        position: true,
        activityType: true,
        instagram: true,
        twitter: true,
        snapchat: true,
        registrations: {
          where: { invitedByRegistrationId: null }, // Only direct registrations
          include: {
            session: true,
            invitedRegistrations: {
              select: {
                id: true,
                guestName: true,
              },
            },
            attendance: true,
          },
          orderBy: { registeredAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "المستخدم غير موجود",
      });
    }

    // Separate upcoming and past registrations
    const now = new Date();
    const upcomingRegistrations = user.registrations
      .filter((r) => new Date(r.session.date) >= now)
      .map((r) => ({
        ...r,
        companions: r.invitedRegistrations.map((inv) => ({
          id: inv.id,
          name: inv.guestName || "",
        })),
      }));
    const pastRegistrations = user.registrations
      .filter((r) => new Date(r.session.date) < now)
      .map((r) => ({
        ...r,
        companions: r.invitedRegistrations.map((inv) => ({
          id: inv.id,
          name: inv.guestName || "",
        })),
      }));

    // Count attended events
    const attendedCount = user.registrations.filter((r) => r.attendance?.attended).length;

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        companyName: user.companyName,
        position: user.position,
        activityType: user.activityType,
        instagram: user.instagram,
        twitter: user.twitter,
        snapchat: user.snapchat,
      },
      stats: {
        totalRegistrations: user.registrations.length,
        upcomingEvents: upcomingRegistrations.length,
        attendedEvents: attendedCount,
      },
      upcomingRegistrations,
      pastRegistrations,
    };
  }),

  /**
   * Check if username is available
   */
  checkUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const user = await db.user.findUnique({
        where: { username: input.username.toLowerCase() },
      });

      return { available: !user };
    }),
});
