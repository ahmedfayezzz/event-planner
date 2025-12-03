import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import { parseQRData, generateQRCode, createQRCheckInData } from "@/lib/qr";

export const attendanceRouter = createTRPCRouter({
  /**
   * Mark user as attended (admin only)
   */
  markAttendance: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        sessionId: z.string(),
        attended: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify user and session exist
      const user = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المستخدم غير موجود",
        });
      }

      const session = await db.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الجلسة غير موجودة",
        });
      }

      // Check if user has approved registration
      const registration = await db.registration.findFirst({
        where: {
          userId: input.userId,
          sessionId: input.sessionId,
          isApproved: true,
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "المستخدم غير مسجل في هذه الجلسة",
        });
      }

      // Upsert attendance record
      const attendance = await db.attendance.upsert({
        where: {
          userId_sessionId: {
            userId: input.userId,
            sessionId: input.sessionId,
          },
        },
        create: {
          userId: input.userId,
          sessionId: input.sessionId,
          attended: input.attended,
          checkInTime: input.attended ? new Date() : null,
        },
        update: {
          attended: input.attended,
          checkInTime: input.attended ? new Date() : null,
        },
      });

      return attendance;
    }),

  /**
   * Mark attendance via QR scan (admin only)
   */
  markAttendanceQR: adminProcedure
    .input(z.object({ qrData: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const parsed = parseQRData(input.qrData);

      if (!parsed || parsed.type !== "attendance") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رمز QR غير صالح",
        });
      }

      // Get registration
      const registration = await db.registration.findUnique({
        where: { id: parsed.registrationId },
        include: {
          session: true,
          user: true,
          companions: true,
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التسجيل غير موجود",
        });
      }

      if (!registration.isApproved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التسجيل غير مؤكد",
        });
      }

      if (registration.sessionId !== parsed.sessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رمز QR لا يتطابق مع الجلسة الحالية",
        });
      }

      // Determine if this is a companion or main registrant
      if (parsed.companionId) {
        // Find companion
        const companion = registration.companions.find(
          (c) => c.id === parsed.companionId
        );

        if (!companion) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المرافق غير موجود",
          });
        }

        // For companions, we just return success (no separate attendance record)
        return {
          success: true,
          type: "companion",
          name: companion.name,
          registrantName: registration.user?.name || registration.guestName,
          sessionTitle: registration.session.title,
        };
      }

      // Main registrant attendance
      if (!registration.userId) {
        // Guest registration - no attendance record, just return success
        return {
          success: true,
          type: "guest",
          name: registration.guestName,
          sessionTitle: registration.session.title,
        };
      }

      // Create/update attendance record
      const attendance = await db.attendance.upsert({
        where: {
          userId_sessionId: {
            userId: registration.userId,
            sessionId: registration.sessionId,
          },
        },
        create: {
          userId: registration.userId,
          sessionId: registration.sessionId,
          attended: true,
          checkInTime: new Date(),
          qrVerified: true,
        },
        update: {
          attended: true,
          checkInTime: new Date(),
          qrVerified: true,
        },
      });

      return {
        success: true,
        type: "user",
        name: registration.user?.name,
        sessionTitle: registration.session.title,
        attendance,
      };
    }),

  /**
   * Get attendance for session (admin only)
   */
  getSessionAttendance: adminProcedure
    .input(z.object({ sessionId: z.string() }))
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

      // Get all approved registrations
      const registrations = await db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          isApproved: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          companions: true,
        },
      });

      // Get attendance records
      const attendances = await db.attendance.findMany({
        where: { sessionId: input.sessionId },
      });

      const attendanceMap = new Map(attendances.map((a) => [a.userId, a]));

      // Combine data
      const attendanceList = registrations.map((r) => {
        const attendance = r.userId ? attendanceMap.get(r.userId) : null;

        return {
          registrationId: r.id,
          userId: r.userId,
          name: r.user?.name || r.guestName,
          email: r.user?.email || r.guestEmail,
          phone: r.user?.phone || r.guestPhone,
          isGuest: !r.user,
          attended: attendance?.attended || false,
          checkInTime: attendance?.checkInTime || null,
          qrVerified: attendance?.qrVerified || false,
          companionCount: r.companions.length,
        };
      });

      const stats = {
        total: registrations.length,
        attended: attendanceList.filter((a) => a.attended).length,
        pending: attendanceList.filter((a) => !a.attended).length,
        totalCompanions: registrations.reduce((acc, r) => acc + r.companions.length, 0),
      };

      return {
        session: {
          id: session.id,
          title: session.title,
          date: session.date,
        },
        attendanceList,
        stats,
      };
    }),

  /**
   * Get user's QR code for session
   */
  getMyQR: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Find user's registration
      const registration = await db.registration.findFirst({
        where: {
          userId: session.user.id,
          sessionId: input.sessionId,
          isApproved: true,
        },
        include: {
          session: true,
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "لم يتم العثور على تسجيل مؤكد لهذه الجلسة",
        });
      }

      // Generate QR code
      const qrData = createQRCheckInData({
        type: "attendance",
        registrationId: registration.id,
        sessionId: registration.sessionId,
        userId: session.user.id,
      });

      const qrCode = await generateQRCode(qrData);

      return {
        qrCode,
        session: {
          id: registration.session.id,
          title: registration.session.title,
          date: registration.session.date,
          location: registration.session.location,
        },
      };
    }),
});
