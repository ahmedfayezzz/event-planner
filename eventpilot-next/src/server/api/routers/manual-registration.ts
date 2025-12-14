import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { sendQrOnlyEmail } from "@/lib/email";
import { createQRCheckInData } from "@/lib/qr";

export const manualRegistrationRouter = createTRPCRouter({
  /**
   * Get users available for manual registration (admin only)
   * Returns all users with their registration status for the session
   */
  getUsersForManualRegistration: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        search: z.string().optional(),
        labelIds: z.array(z.string()).optional(),
        limit: z.number().min(1).max(100).default(50),
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
        registrations
          .map((r) => r.userId)
          .filter((id): id is string => id !== null)
      );

      // Build where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        isActive: true,
        role: { in: ["USER", "GUEST"] }, // Only regular users, not admins
      };

      if (input.search) {
        where.OR = [
          { name: { contains: input.search } },
          { email: { contains: input.search } },
          { phone: { contains: input.search } },
          { companyName: { contains: input.search } },
        ];
      }

      // Filter by labels if provided
      if (input.labelIds && input.labelIds.length > 0) {
        where.labels = {
          some: {
            id: { in: input.labelIds },
          },
        };
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
          role: true,
          labels: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
        take: input.limit,
        orderBy: { name: "asc" },
      });

      // Add registration status
      return users.map((user) => ({
        ...user,
        isRegistered: registeredUserIds.has(user.id),
      }));
    }),

  /**
   * Manual registration - register users and/or create guests
   */
  manualRegister: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userIds: z.array(z.string()),
        newGuests: z.array(
          z.object({
            name: z.string().min(1),
            phone: z.string().min(1),
            email: z.string().email().optional().or(z.literal("")),
            companyName: z.string().optional(),
            position: z.string().optional(),
          })
        ),
        sendQrEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify session exists
      const session = await db.session.findUnique({
        where: { id: input.sessionId },
        select: {
          id: true,
          title: true,
          sessionNumber: true,
          date: true,
          location: true,
          locationUrl: true,
          slug: true,
          sendQrInEmail: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحدث غير موجود",
        });
      }

      // Get existing registrations to avoid duplicates
      const existingRegistrations = await db.registration.findMany({
        where: { sessionId: input.sessionId },
        select: { userId: true, guestPhone: true },
      });

      const registeredUserIds = new Set(
        existingRegistrations
          .map((r) => r.userId)
          .filter((id): id is string => id !== null)
      );
      const registeredPhones = new Set(
        existingRegistrations
          .map((r) => r.guestPhone)
          .filter((phone): phone is string => phone !== null)
      );

      let registeredCount = 0;
      let skippedCount = 0;
      const emailsToSend: Array<{
        email: string;
        name: string;
        registrationId: string;
      }> = [];

      // Register existing users
      for (const userId of input.userIds) {
        if (registeredUserIds.has(userId)) {
          skippedCount++;
          continue;
        }

        const user = await db.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (!user) continue;

        const registration = await db.registration.create({
          data: {
            sessionId: input.sessionId,
            userId,
            isApproved: true,
            // Manual registration tracking
            isManual: true,
            manualAddedBy: ctx.session.user.id,
            manualAddedAt: new Date(),
          },
        });

        registeredCount++;

        // Queue email for existing users (they get full confirmed email, handled elsewhere)
        // For now, we only send QR-only emails to new guests
      }

      // Register new guests
      for (const guest of input.newGuests) {
        // Normalize phone for comparison
        const normalizedPhone = guest.phone.replace(/\D/g, "");

        // Check if already registered by phone
        if (registeredPhones.has(guest.phone) || registeredPhones.has(normalizedPhone)) {
          skippedCount++;
          continue;
        }

        // Check if user exists by phone
        let user = await db.user.findFirst({
          where: {
            OR: [
              { phone: guest.phone },
              { phone: normalizedPhone },
            ],
          },
        });

        // Create guest user if not exists
        if (!user) {
          // Generate unique username for guest
          const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const guestUsername = `guest-${uniqueSuffix}`;

          user = await db.user.create({
            data: {
              name: guest.name,
              phone: guest.phone,
              email: guest.email || `guest-${uniqueSuffix}@placeholder.local`,
              username: guestUsername,
              role: "GUEST",
              isActive: true,
              companyName: guest.companyName || null,
              position: guest.position || null,
              // Manual creation tracking
              isManuallyCreated: true,
              createdByAdminId: ctx.session.user.id,
            },
          });
        }

        // Check if this user is already registered
        if (registeredUserIds.has(user.id)) {
          skippedCount++;
          continue;
        }

        // Create registration
        const registration = await db.registration.create({
          data: {
            sessionId: input.sessionId,
            userId: user.id,
            isApproved: true,
            guestName: guest.name,
            guestPhone: guest.phone,
            guestEmail: guest.email || null,
            guestCompanyName: guest.companyName || null,
            guestPosition: guest.position || null,
            // Manual registration tracking
            isManual: true,
            manualAddedBy: ctx.session.user.id,
            manualAddedAt: new Date(),
          },
        });

        registeredCount++;

        // Queue QR-only email for guests with valid email
        if (input.sendQrEmail && guest.email && !guest.email.includes("@placeholder.local")) {
          emailsToSend.push({
            email: guest.email,
            name: guest.name,
            registrationId: registration.id,
          });
        }
      }

      // Send QR-only emails to new guests
      let emailsSent = 0;
      let emailsFailed = 0;

      for (const emailData of emailsToSend) {
        try {
          const qrData = createQRCheckInData({
            type: "attendance",
            registrationId: emailData.registrationId,
            sessionId: input.sessionId,
          });

          const success = await sendQrOnlyEmail(
            emailData.email,
            emailData.name,
            {
              title: session.title,
              sessionNumber: session.sessionNumber,
              date: session.date,
              location: session.location,
              locationUrl: session.locationUrl,
              slug: session.slug,
              id: session.id,
              sendQrInEmail: session.sendQrInEmail,
            },
            qrData
          );

          if (success) {
            emailsSent++;
          } else {
            emailsFailed++;
          }
        } catch (error) {
          console.error("Failed to send QR email:", error);
          emailsFailed++;
        }
      }

      return {
        registered: registeredCount,
        skipped: skippedCount,
        emailsSent,
        emailsFailed,
      };
    }),

  /**
   * Get all labels for filtering
   */
  getLabels: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    return db.userLabel.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }),
});
