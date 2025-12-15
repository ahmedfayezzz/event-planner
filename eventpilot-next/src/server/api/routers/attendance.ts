import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import { parseQRData, generateQRCode, createQRCheckInData } from "@/lib/qr";
// PNG generation kept for future use: import { generateBrandedQRCode } from "@/lib/qr-branded";
import { generateBrandedQRPdf } from "@/lib/qr-pdf";
import { toSaudiTime } from "@/lib/timezone";

// Helper to split location into two lines for PDF
function splitLocationForPdf(location: string | null | undefined): {
  line1: string | undefined;
  line2: string | undefined;
} {
  if (!location) return { line1: undefined, line2: undefined };

  // check by string length instead of words
  if (location.length <= 20) {
    return { line1: location, line2: undefined };
  }

  // If it's a short location (2 words or less), keep it on one line
  const words = location.trim().split(/\s+/);
  if (words.length <= 2) {
    return { line1: location, line2: undefined };
  }

  // For longer locations, split roughly in half
  const midPoint = 2;
  return {
    line1: words.slice(0, midPoint).join(" "),
    line2: words.slice(midPoint).join(" "),
  };
}

export const attendanceRouter = createTRPCRouter({
  /**
   * Mark registration as attended (admin only)
   */
  markAttendance: adminProcedure
    .input(
      z.object({
        registrationId: z.string(),
        attended: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get registration
      const registration = await db.registration.findUnique({
        where: { id: input.registrationId },
        include: { session: true },
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

      // Upsert attendance record
      const attendance = await db.attendance.upsert({
        where: {
          registrationId: input.registrationId,
        },
        create: {
          registrationId: input.registrationId,
          sessionId: registration.sessionId,
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
          invitedByRegistration: {
            include: {
              user: true,
            },
          },
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
          message: "رمز QR لا يتطابق مع الحدث الحالي",
        });
      }

      // Create/update attendance record
      const attendance = await db.attendance.upsert({
        where: {
          registrationId: registration.id,
        },
        create: {
          registrationId: registration.id,
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

      // Determine display info based on registration type
      const isInvited = !!registration.invitedByRegistrationId;
      const name = registration.user?.name || registration.guestName;
      const inviterName =
        registration.invitedByRegistration?.user?.name ||
        registration.invitedByRegistration?.guestName;

      return {
        success: true,
        type: isInvited ? "companion" : registration.user ? "user" : "guest",
        name,
        registrantName: isInvited ? inviterName : undefined,
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
          message: "الحدث غير موجود",
        });
      }

      // Get all approved registrations (both direct and invited)
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
          attendance: true,
          invitedByRegistration: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          invitedRegistrations: true,
        },
      });

      // Combine data
      const attendanceList = registrations.map((r) => {
        const isInvited = !!r.invitedByRegistrationId;

        return {
          registrationId: r.id,
          userId: r.userId,
          name: r.user?.name || r.guestName,
          email: r.user?.email || r.guestEmail,
          phone: r.user?.phone || r.guestPhone,
          isGuest: !r.user,
          isInvited,
          invitedByName:
            r.invitedByRegistration?.user?.name ||
            r.invitedByRegistration?.guestName,
          attended: r.attendance?.attended || false,
          checkInTime: r.attendance?.checkInTime || null,
          qrVerified: r.attendance?.qrVerified || false,
          companionCount: r.invitedRegistrations.length,
        };
      });

      // Calculate stats
      const directRegistrations = registrations.filter(
        (r) => !r.invitedByRegistrationId
      );
      const invitedRegistrations = registrations.filter(
        (r) => !!r.invitedByRegistrationId
      );

      const stats = {
        totalDirect: directRegistrations.length,
        totalInvited: invitedRegistrations.length,
        total: registrations.length,
        attendedDirect: directRegistrations.filter(
          (r) => r.attendance?.attended
        ).length,
        attendedInvited: invitedRegistrations.filter(
          (r) => r.attendance?.attended
        ).length,
        attended: registrations.filter((r) => r.attendance?.attended).length,
        pending: registrations.filter((r) => !r.attendance?.attended).length,
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
          message: "لم يتم العثور على تسجيل مؤكد لهذا الحدث",
        });
      }

      // Generate QR code
      const qrData = createQRCheckInData({
        type: "attendance",
        registrationId: registration.id,
        sessionId: registration.sessionId,
      });

      const qrCode = await generateQRCode(qrData);

      return {
        qrCode,
        session: {
          id: registration.session.id,
          title: registration.session.title,
          date: registration.session.date,
          location: registration.session.location,
          locationUrl: registration.session.locationUrl,
        },
      };
    }),

  /**
   * Get branded QR code for download
   */
  getBrandedQR: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Find user's registration with user info
      const registration = await db.registration.findFirst({
        where: {
          userId: session.user.id,
          sessionId: input.sessionId,
          isApproved: true,
        },
        include: {
          session: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "لم يتم العثور على تسجيل مؤكد لهذا الحدث",
        });
      }

      // Generate QR data
      const qrData = createQRCheckInData({
        type: "attendance",
        registrationId: registration.id,
        sessionId: registration.sessionId,
      });

      // Format date and time for the branded QR (in Saudi timezone)
      const saudiSessionDate = toSaudiTime(registration.session.date);
      // Arabic format: "١٦ ديسمبر" (day + month)
      const sessionDate =
        saudiSessionDate?.toLocaleDateString("ar-SA", {
          day: "numeric",
          month: "long",
          numberingSystem: "arab",
        }) ?? "";
      // Arabic format: "الثلاثاء" (day name)
      const sessionDayName =
        saudiSessionDate?.toLocaleDateString("ar-SA", {
          weekday: "long",
        }) ?? "";
      const sessionTime =
        saudiSessionDate?.toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
          numberingSystem: "arab",
        }) ?? "";

      // Get attendee name
      const attendeeName =
        registration.user?.name || registration.guestName || undefined;

      // Generate branded QR as PDF
      const locationParts = splitLocationForPdf(registration.session.location);
      const pdfBuffer = await generateBrandedQRPdf(qrData, {
        sessionTitle: registration.session.title,
        sessionDate,
        sessionDayName,
        sessionTime,
        attendeeName,
        location: locationParts.line1,
        locationLine2: locationParts.line2,
        locationUrl: registration.session.locationUrl ?? undefined,
      });

      if (!pdfBuffer) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل في إنشاء رمز QR",
        });
      }

      return {
        qrCode: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
        session: {
          id: registration.session.id,
          title: registration.session.title,
          date: registration.session.date,
          location: registration.session.location,
          locationUrl: registration.session.locationUrl,
        },
      };
    }),

  /**
   * Get QR code by registration ID (public - for sharing via WhatsApp)
   */
  getPublicQR: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const registration = await db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          session: true,
          user: {
            select: {
              name: true,
            },
          },
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
          message: "التسجيل غير مؤكد بعد",
        });
      }

      // Generate QR code
      const qrData = createQRCheckInData({
        type: "attendance",
        registrationId: registration.id,
        sessionId: registration.sessionId,
      });

      const qrCode = await generateQRCode(qrData);

      return {
        qrCode,
        attendeeName: registration.user?.name || registration.guestName,
        session: {
          id: registration.session.id,
          title: registration.session.title,
          date: registration.session.date,
          location: registration.session.location,
          locationUrl: registration.session.locationUrl,
        },
      };
    }),

  /**
   * Get branded QR code by registration ID (public - for download)
   */
  getPublicBrandedQR: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const registration = await db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          session: true,
          user: {
            select: {
              name: true,
            },
          },
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
          message: "التسجيل غير مؤكد بعد",
        });
      }

      // Generate QR data
      const qrData = createQRCheckInData({
        type: "attendance",
        registrationId: registration.id,
        sessionId: registration.sessionId,
      });

      // Format date and time for the branded QR (in Saudi timezone)
      const saudiSessionDate = toSaudiTime(registration.session.date);
      // Arabic format: "١٦ ديسمبر" (day + month)
      const sessionDate =
        saudiSessionDate?.toLocaleDateString("ar-SA", {
          day: "numeric",
          month: "long",
          numberingSystem: "arab",
        }) ?? "";
      // Arabic format: "الثلاثاء" (day name)
      const sessionDayName =
        saudiSessionDate?.toLocaleDateString("ar-SA", {
          weekday: "long",
        }) ?? "";
      const sessionTime =
        saudiSessionDate?.toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
          numberingSystem: "arab",
        }) ?? "";

      // Get attendee name
      const attendeeName =
        registration.user?.name || registration.guestName || undefined;

      // Generate branded QR as PDF
      const locationParts = splitLocationForPdf(registration.session.location);
      const pdfBuffer = await generateBrandedQRPdf(qrData, {
        sessionTitle: registration.session.title,
        sessionDate,
        sessionDayName,
        sessionTime,
        attendeeName,
        location: locationParts.line1,
        locationLine2: locationParts.line2,
        locationUrl: registration.session.locationUrl ?? undefined,
      });

      if (!pdfBuffer) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل في إنشاء رمز QR",
        });
      }

      return {
        qrCode: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
        attendeeName,
        session: {
          id: registration.session.id,
          title: registration.session.title,
          date: registration.session.date,
          location: registration.session.location,
          locationUrl: registration.session.locationUrl,
        },
      };
    }),
});
