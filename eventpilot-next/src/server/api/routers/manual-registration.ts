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
        roleFilter: z.enum(["all", "USER", "GUEST"]).optional(),
        limit: z.number().min(1).max(500).default(100),
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
      };

      // Filter by role if specified (default: all users)
      if (input.roleFilter && input.roleFilter !== "all") {
        where.role = input.roleFilter;
      }

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
   * Optimized for bulk operations (100+ users)
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

      // Get existing registrations to avoid duplicates (single query)
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

      // ============================================
      // BULK REGISTER EXISTING USERS (Optimized)
      // ============================================

      // Filter out already registered users
      const userIdsToRegister = input.userIds.filter((id) => {
        if (registeredUserIds.has(id)) {
          skippedCount++;
          return false;
        }
        return true;
      });

      if (userIdsToRegister.length > 0) {
        // Fetch all users in a single query
        const usersToRegister = await db.user.findMany({
          where: { id: { in: userIdsToRegister } },
          select: { id: true, email: true, name: true },
        });

        const validUserIds = new Set(usersToRegister.map((u) => u.id));
        const userMap = new Map(usersToRegister.map((u) => [u.id, u]));

        // Filter to only valid user IDs
        const validUserIdsToRegister = userIdsToRegister.filter((id) => validUserIds.has(id));

        // Prepare bulk registration data
        const userRegistrationData = validUserIdsToRegister.map((userId) => ({
          sessionId: input.sessionId,
          userId,
          isApproved: true,
          isManual: true,
          manualAddedBy: ctx.session.user.id,
          manualAddedAt: new Date(),
        }));

        // Bulk create registrations
        if (userRegistrationData.length > 0) {
          await db.registration.createMany({
            data: userRegistrationData,
            skipDuplicates: true,
          });
          registeredCount += userRegistrationData.length;

          // If sendQrEmail is enabled, fetch created registrations and queue emails
          if (input.sendQrEmail) {
            const createdRegistrations = await db.registration.findMany({
              where: {
                sessionId: input.sessionId,
                userId: { in: validUserIdsToRegister },
              },
              select: { id: true, userId: true },
            });

            for (const reg of createdRegistrations) {
              const user = userMap.get(reg.userId!);
              if (user && user.email && !user.email.includes("@placeholder.local")) {
                emailsToSend.push({
                  email: user.email,
                  name: user.name,
                  registrationId: reg.id,
                });
              }
            }
          }
        }
      }

      // ============================================
      // REGISTER NEW GUESTS (Sequential - needs user creation)
      // ============================================

      // For guests, we need sequential processing due to user creation
      // But we can optimize by batching the phone lookups
      const guestPhones = input.newGuests.map((g) => g.phone);
      const normalizedPhones = guestPhones.map((p) => p.replace(/\D/g, ""));
      const allPhones = [...new Set([...guestPhones, ...normalizedPhones])];

      // Fetch all existing users by phone in one query
      const existingUsersByPhone = await db.user.findMany({
        where: { phone: { in: allPhones } },
      });

      const phoneToUserMap = new Map<string, typeof existingUsersByPhone[0]>();
      for (const user of existingUsersByPhone) {
        phoneToUserMap.set(user.phone, user);
      }

      // Existing users found by phone - will be registered as regular users (not guests)
      const existingUsersByPhoneToRegister: typeof existingUsersByPhone = [];

      const newUsersToCreate: Array<{
        guest: typeof input.newGuests[0];
        tempId: string;
      }> = [];

      // Process guests to determine which need new users vs existing users
      for (const guest of input.newGuests) {
        const normalizedPhone = guest.phone.replace(/\D/g, "");

        // Check if already registered by phone
        if (registeredPhones.has(guest.phone) || registeredPhones.has(normalizedPhone)) {
          skippedCount++;
          continue;
        }

        // Check if user exists
        const user = phoneToUserMap.get(guest.phone) || phoneToUserMap.get(normalizedPhone);

        if (user) {
          // Check if this user is already registered
          if (registeredUserIds.has(user.id)) {
            skippedCount++;
            continue;
          }

          // Existing user - register as regular user (not guest)
          existingUsersByPhoneToRegister.push(user);

          // Track for skipping duplicates
          registeredUserIds.add(user.id);
        } else {
          // Need to create new user
          newUsersToCreate.push({
            guest,
            tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          });
        }
      }

      // Bulk register existing users found by phone (as regular registrations, not guests)
      if (existingUsersByPhoneToRegister.length > 0) {
        const existingUserIds = existingUsersByPhoneToRegister.map((u) => u.id);
        const existingUserMap = new Map(existingUsersByPhoneToRegister.map((u) => [u.id, u]));

        const existingUserRegistrationData = existingUserIds.map((userId) => ({
          sessionId: input.sessionId,
          userId,
          isApproved: true,
          isManual: true,
          manualAddedBy: ctx.session.user.id,
          manualAddedAt: new Date(),
        }));

        await db.registration.createMany({
          data: existingUserRegistrationData,
          skipDuplicates: true,
        });
        registeredCount += existingUserRegistrationData.length;

        // Queue emails for existing users found by phone
        if (input.sendQrEmail) {
          const createdRegs = await db.registration.findMany({
            where: {
              sessionId: input.sessionId,
              userId: { in: existingUserIds },
            },
            select: { id: true, userId: true },
          });

          for (const reg of createdRegs) {
            const user = existingUserMap.get(reg.userId!);
            if (user && user.email && !user.email.includes("@placeholder.local")) {
              emailsToSend.push({
                email: user.email,
                name: user.name,
                registrationId: reg.id,
              });
            }
          }
        }
      }

      // Create new users and their registrations
      for (const { guest, tempId } of newUsersToCreate) {
        const guestUsername = `guest-${tempId}`;

        const user = await db.user.create({
          data: {
            name: guest.name,
            phone: guest.phone,
            email: guest.email || `guest-${tempId}@placeholder.local`,
            username: guestUsername,
            role: "GUEST",
            isActive: true,
            companyName: guest.companyName || null,
            position: guest.position || null,
            isManuallyCreated: true,
            createdByAdminId: ctx.session.user.id,
          },
        });

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

      // ============================================
      // SEND EMAILS (Fire and forget - non-blocking)
      // ============================================
      const emailsQueued = emailsToSend.length;

      // Fire and forget - emails sent in background with rate limiting
      if (emailsToSend.length > 0) {
        const sessionData = {
          title: session.title,
          sessionNumber: session.sessionNumber,
          date: session.date,
          location: session.location,
          locationUrl: session.locationUrl,
          slug: session.slug,
          id: session.id,
          sendQrInEmail: session.sendQrInEmail,
        };
        const sessionId = input.sessionId;

        // Don't await - let it run in background
        Promise.resolve().then(async () => {
          for (const emailData of emailsToSend) {
            try {
              const qrData = createQRCheckInData({
                type: "attendance",
                registrationId: emailData.registrationId,
                sessionId,
              });

              await sendQrOnlyEmail(
                emailData.email,
                emailData.name,
                sessionData,
                qrData
              );
            } catch (error) {
              console.error("Failed to send QR email:", error);
            }
          }
        }).catch((error) => {
          console.error("Email sending background task failed:", error);
        });
      }

      return {
        registered: registeredCount,
        skipped: skippedCount,
        emailsQueued,
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
