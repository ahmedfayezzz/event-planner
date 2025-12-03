import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
} from "../trpc";
import { generateQRCode } from "@/lib/qr";
import { exportToCSV } from "@/lib/utils";

export const adminRouter = createTRPCRouter({
  /**
   * Get admin dashboard stats
   */
  getDashboard: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const now = new Date();

    // Get counts
    const [
      totalUsers,
      totalSessions,
      totalRegistrations,
      upcomingSessions,
      recentRegistrations,
      recentSessions,
    ] = await Promise.all([
      db.user.count(),
      db.session.count(),
      db.registration.count({ where: { isApproved: true } }),
      db.session.findMany({
        where: {
          date: { gt: now },
          status: "open",
        },
        orderBy: { date: "asc" },
        take: 5,
        include: {
          _count: {
            select: { registrations: { where: { isApproved: true } } },
          },
        },
      }),
      db.registration.findMany({
        take: 10,
        orderBy: { registeredAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          session: { select: { title: true } },
        },
      }),
      db.session.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { registrations: true },
          },
        },
      }),
    ]);

    // Get pending approvals count
    const pendingApprovals = await db.registration.count({
      where: { isApproved: false },
    });

    // Get attendance stats for last 5 sessions
    const attendanceStats = await db.session.findMany({
      where: {
        date: { lt: now },
      },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        _count: {
          select: {
            registrations: { where: { isApproved: true } },
            attendances: { where: { attended: true } },
          },
        },
      },
    });

    return {
      stats: {
        totalUsers,
        totalSessions,
        totalRegistrations,
        pendingApprovals,
      },
      upcomingSessions: upcomingSessions.map((s) => ({
        ...s,
        registrationCount: s._count.registrations,
        availableSpots: s.maxParticipants - s._count.registrations,
      })),
      recentRegistrations: recentRegistrations.map((r) => ({
        id: r.id,
        name: r.user?.name || r.guestName,
        email: r.user?.email || r.guestEmail,
        sessionTitle: r.session.title,
        registeredAt: r.registeredAt,
        isApproved: r.isApproved,
        isGuest: !r.user,
      })),
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        title: s.title,
        sessionNumber: s.sessionNumber,
        date: s.date,
        status: s.status,
        registrationCount: s._count.registrations,
      })),
      attendanceStats: attendanceStats.map((s) => ({
        sessionId: s.id,
        title: s.title,
        date: s.date,
        registrations: s._count.registrations,
        attendees: s._count.attendances,
        attendanceRate:
          s._count.registrations > 0
            ? Math.round((s._count.attendances / s._count.registrations) * 100)
            : 0,
      })),
    };
  }),

  /**
   * Export users to CSV
   */
  exportUsers: adminProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const users = await db.user.findMany({
        where: input?.includeInactive ? {} : { isActive: true },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          companyName: true,
          position: true,
          activityType: true,
          gender: true,
          instagram: true,
          snapchat: true,
          twitter: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              registrations: { where: { isApproved: true } },
              attendances: { where: { attended: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const data = users.map((u) => ({
        الاسم: u.name,
        "اسم المستخدم": u.username,
        البريد: u.email,
        الهاتف: u.phone,
        الشركة: u.companyName || "",
        المنصب: u.position || "",
        "نوع النشاط": u.activityType || "",
        الجنس: u.gender === "male" ? "ذكر" : u.gender === "female" ? "أنثى" : "",
        انستغرام: u.instagram || "",
        سناب: u.snapchat || "",
        تويتر: u.twitter || "",
        "عدد التسجيلات": u._count.registrations,
        "عدد الحضور": u._count.attendances,
        "تاريخ الانضمام": u.createdAt.toLocaleDateString("ar-SA"),
      }));

      const csv = exportToCSV(data);

      return { csv, count: users.length };
    }),

  /**
   * Export session registrations to CSV
   */
  exportSessionRegistrations: adminProcedure
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

      const registrations = await db.registration.findMany({
        where: { sessionId: input.sessionId },
        include: {
          user: true,
          companions: true,
        },
        orderBy: { registeredAt: "desc" },
      });

      const data = registrations.map((r) => ({
        الاسم: r.user?.name || r.guestName || "",
        البريد: r.user?.email || r.guestEmail || "",
        الهاتف: r.user?.phone || r.guestPhone || "",
        الشركة: r.user?.companyName || r.guestCompanyName || "",
        المنصب: r.user?.position || r.guestPosition || "",
        "نوع التسجيل": r.user ? "عضو" : "زائر",
        "الحالة": r.isApproved ? "مؤكد" : "معلق",
        "عدد المرافقين": r.companions.length,
        "أسماء المرافقين": r.companions.map((c) => c.name).join(", "),
        "تاريخ التسجيل": r.registeredAt.toLocaleDateString("ar-SA"),
      }));

      const csv = exportToCSV(data);

      return {
        csv,
        count: registrations.length,
        sessionTitle: session.title,
      };
    }),

  /**
   * Get session QR code for check-in
   */
  getSessionQR: adminProcedure
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

      // Generate QR code that links to check-in page
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      const checkInUrl = `${baseUrl}/admin/checkin/${session.id}`;
      const qrCode = await generateQRCode(checkInUrl);

      return {
        qrCode,
        checkInUrl,
        session: {
          id: session.id,
          title: session.title,
          date: session.date,
        },
      };
    }),

  /**
   * Get all users (admin only)
   */
  getUsers: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(["USER", "ADMIN"]).optional(),
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
          { companyName: { contains: input.search } },
        ];
      }

      if (input?.role) {
        where.role = input.role;
      }

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      const users = await db.user.findMany({
        where,
        take: (input?.limit ?? 50) + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          companyName: true,
          position: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              registrations: { where: { isApproved: true } },
              attendances: { where: { attended: true } },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (users.length > (input?.limit ?? 50)) {
        const nextItem = users.pop();
        nextCursor = nextItem?.id;
      }

      return {
        users: users.map((u) => ({
          ...u,
          registrationCount: u._count.registrations,
          attendanceCount: u._count.attendances,
        })),
        nextCursor,
      };
    }),

  /**
   * Toggle user active status (admin only)
   */
  toggleUserActive: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Prevent self-deactivation
      if (input.userId === session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكنك تعطيل حسابك الخاص",
        });
      }

      const user = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المستخدم غير موجود",
        });
      }

      const updated = await db.user.update({
        where: { id: input.userId },
        data: { isActive: !user.isActive },
      });

      return {
        success: true,
        isActive: updated.isActive,
      };
    }),

  /**
   * Update user role (admin only)
   */
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["USER", "ADMIN"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Prevent self role change
      if (input.userId === session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكنك تغيير صلاحياتك الخاصة",
        });
      }

      const user = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المستخدم غير موجود",
        });
      }

      const updated = await db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });

      return {
        success: true,
        role: updated.role,
      };
    }),
});
