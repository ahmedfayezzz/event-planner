import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  superAdminProcedure,
} from "../trpc";
import { generateQRCode } from "@/lib/qr";
import { exportToCSV } from "@/lib/utils";
import { getHostingTypeLabel } from "@/lib/constants";
import { ADMIN_PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { toSaudiTime } from "@/lib/timezone";

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
            },
          },
          registrations: {
            where: { attendance: { attended: true } },
            select: { id: true },
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
        "عدد الحضور": u.registrations.length,
        "تاريخ الانضمام": toSaudiTime(u.createdAt)?.toLocaleDateString("ar-SA") ?? "",
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
          message: "الحدث غير موجود",
        });
      }

      const registrations = await db.registration.findMany({
        where: { sessionId: input.sessionId },
        include: {
          user: true,
          invitedRegistrations: true,
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
        "عدد المرافقين": r.invitedRegistrations.length,
        "أسماء المرافقين": r.invitedRegistrations.map((c) => c.guestName).join(", "),
        "تاريخ التسجيل": toSaudiTime(r.registeredAt)?.toLocaleDateString("ar-SA") ?? "",
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
          message: "الحدث غير موجود",
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
        role: z.enum(["USER", "GUEST", "ADMIN", "SUPER_ADMIN"]).optional(),
        isActive: z.boolean().optional(),
        labelIds: z.array(z.string()).optional(),
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
      } else {
        // By default, only show USER and GUEST roles (exclude ADMIN and SUPER_ADMIN)
        where.role = { in: ["USER", "GUEST"] };
      }

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input?.labelIds && input.labelIds.length > 0) {
        where.labels = {
          some: {
            id: {
              in: input.labelIds,
            },
          },
        };
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
          isManuallyCreated: true,
          createdAt: true,
          labels: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          _count: {
            select: {
              registrations: { where: { isApproved: true } },
              notes: true,
            },
          },
          registrations: {
            where: { attendance: { attended: true } },
            select: { id: true },
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
          attendanceCount: u.registrations.length,
          noteCount: u._count.notes,
        })),
        nextCursor,
      };
    }),

  /**
   * Get user by ID with full details (admin only)
   */
  getUserById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const user = await db.user.findUnique({
        where: { id: input.id },
        include: {
          labels: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          notes: {
            include: {
              createdBy: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          registrations: {
            orderBy: { registeredAt: "desc" },
            include: {
              session: {
                select: {
                  id: true,
                  title: true,
                  sessionNumber: true,
                  date: true,
                },
              },
              attendance: {
                select: {
                  attended: true,
                  checkInTime: true,
                },
              },
              invitedRegistrations: {
                select: {
                  id: true,
                  guestName: true,
                },
              },
            },
          },
          eventCaterings: {
            orderBy: { createdAt: "desc" },
            include: {
              session: {
                select: {
                  id: true,
                  title: true,
                  sessionNumber: true,
                  date: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المستخدم غير موجود",
        });
      }

      // Calculate stats
      const stats = {
        totalRegistrations: user.registrations.length,
        totalAttendances: user.registrations.filter((r) => r.attendance?.attended).length,
        totalCompanions: user.registrations.reduce((sum, r) => sum + r.invitedRegistrations.length, 0),
        hostingRequests: user.eventCaterings.length,
      };

      return {
        ...user,
        stats,
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
   * Update user role (super admin only)
   */
  updateUserRole: superAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["USER", "ADMIN"]),
        permissions: z
          .array(
            z.enum([
              "dashboard",
              "sessions",
              "users",
              "hosts",
              "analytics",
              "checkin",
              "settings",
            ])
          )
          .optional(),
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

      // Cannot change SUPER_ADMIN role
      if (user.role === "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكنك تغيير صلاحيات المدير الرئيسي",
        });
      }

      // When promoting to ADMIN, use provided permissions or default to all true
      // When demoting to USER, reset all permissions to false
      const permissionData =
        input.role === "ADMIN"
          ? {
              canAccessDashboard:
                input.permissions?.includes("dashboard") ?? true,
              canAccessSessions:
                input.permissions?.includes("sessions") ?? true,
              canAccessUsers: input.permissions?.includes("users") ?? true,
              canAccessHosts: input.permissions?.includes("hosts") ?? true,
              canAccessAnalytics:
                input.permissions?.includes("analytics") ?? true,
              canAccessCheckin:
                input.permissions?.includes("checkin") ?? true,
              canAccessSettings:
                input.permissions?.includes("settings") ?? true,
            }
          : {
              canAccessDashboard: false,
              canAccessSessions: false,
              canAccessUsers: false,
              canAccessHosts: false,
              canAccessAnalytics: false,
              canAccessCheckin: false,
              canAccessSettings: false,
            };

      const updated = await db.user.update({
        where: { id: input.userId },
        data: {
          role: input.role,
          ...permissionData,
        },
      });

      return {
        success: true,
        role: updated.role,
      };
    }),

  /**
   * Create a new admin user (super admin only)
   */
  createAdmin: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(2, "الاسم مطلوب"),
        email: z.string().email("البريد الإلكتروني غير صالح"),
        password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
        phone: z.string().min(9, "رقم الهاتف مطلوب"),
        permissions: z.array(
          z.enum([
            "dashboard",
            "sessions",
            "users",
            "hosts",
            "analytics",
            "checkin",
            "settings",
          ])
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const bcrypt = await import("bcryptjs");

      // Check if email already exists
      const existingUser = await db.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "البريد الإلكتروني مستخدم بالفعل",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Build permission data
      const allPermissions: PermissionKey[] = [
        "dashboard",
        "sessions",
        "users",
        "hosts",
        "analytics",
        "checkin",
        "settings",
      ];

      const permissionData: Record<string, boolean> = {};
      for (const perm of allPermissions) {
        const field = ADMIN_PERMISSIONS[perm];
        permissionData[field] = input.permissions.includes(perm);
      }

      // Create the admin user
      const user = await db.user.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone,
          username: input.email.split("@")[0],
          passwordHash,
          role: "ADMIN",
          isActive: true,
          isApproved: true,
          ...permissionData,
        },
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  /**
   * Bootstrap: Upgrade current admin to SUPER_ADMIN if no SUPER_ADMIN exists
   * This is a one-time setup action for the first admin
   */
  bootstrapSuperAdmin: adminProcedure.mutation(async ({ ctx }) => {
    const { db, session } = ctx;

    // Check if any SUPER_ADMIN already exists
    const existingSuperAdmin = await db.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (existingSuperAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "يوجد مدير رئيسي بالفعل في النظام",
      });
    }

    // Upgrade current user to SUPER_ADMIN
    const updated = await db.user.update({
      where: { id: session.user.id },
      data: {
        role: "SUPER_ADMIN",
        canAccessDashboard: true,
        canAccessSessions: true,
        canAccessUsers: true,
        canAccessHosts: true,
        canAccessAnalytics: true,
        canAccessCheckin: true,
        canAccessSettings: true,
      },
    });

    return {
      success: true,
      message: "تم ترقيتك إلى مدير رئيسي بنجاح. يرجى تسجيل الخروج وإعادة تسجيل الدخول.",
      user: {
        id: updated.id,
        name: updated.name,
        role: updated.role,
      },
    };
  }),

  /**
   * Get admin users with their permissions (super admin only)
   */
  getAdminUsers: superAdminProcedure.query(async ({ ctx }) => {
    const { db, session } = ctx;

    const admins = await db.user.findMany({
      where: {
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        canAccessDashboard: true,
        canAccessSessions: true,
        canAccessUsers: true,
        canAccessHosts: true,
        canAccessAnalytics: true,
        canAccessCheckin: true,
        canAccessSettings: true,
        createdAt: true,
      },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    });

    return {
      admins,
      currentUserId: session.user.id,
    };
  }),

  /**
   * Update user permissions (super admin only)
   */
  updateUserPermissions: superAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        permissions: z.array(
          z.enum([
            "dashboard",
            "sessions",
            "users",
            "hosts",
            "analytics",
            "checkin",
            "settings",
          ])
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Prevent self permission change
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

      // Cannot change SUPER_ADMIN permissions
      if (user.role === "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكنك تغيير صلاحيات المدير الرئيسي",
        });
      }

      // Build permission data object
      const permissionData: Record<string, boolean> = {};
      const allPermissions: PermissionKey[] = [
        "dashboard",
        "sessions",
        "users",
        "hosts",
        "analytics",
        "checkin",
        "settings",
      ];

      for (const perm of allPermissions) {
        const field = ADMIN_PERMISSIONS[perm];
        permissionData[field] = input.permissions.includes(perm);
      }

      const updated = await db.user.update({
        where: { id: input.userId },
        data: permissionData,
      });

      return {
        success: true,
        user: {
          id: updated.id,
          name: updated.name,
          canAccessDashboard: updated.canAccessDashboard,
          canAccessSessions: updated.canAccessSessions,
          canAccessUsers: updated.canAccessUsers,
          canAccessHosts: updated.canAccessHosts,
          canAccessAnalytics: updated.canAccessAnalytics,
          canAccessCheckin: updated.canAccessCheckin,
          canAccessSettings: updated.canAccessSettings,
        },
      };
    }),

  /**
   * Get analytics data (admin only)
   */
  getAnalytics: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const dateFilter = {
        ...(input?.startDate && { gte: input.startDate }),
        ...(input?.endDate && { lte: input.endDate }),
      };

      // Overview stats
      const [totalUsers, totalSessions, totalRegistrations] = await Promise.all([
        db.user.count({ where: { isActive: true } }),
        db.session.count(),
        db.registration.count({ where: { isApproved: true } }),
      ]);

      // Get all completed sessions for attendance rate
      const completedSessions = await db.session.findMany({
        where: { status: "completed" },
        include: {
          _count: {
            select: {
              registrations: { where: { isApproved: true } },
              attendances: { where: { attended: true } },
            },
          },
        },
      });

      const totalAttendees = completedSessions.reduce(
        (sum, s) => sum + s._count.attendances,
        0
      );
      const totalExpected = completedSessions.reduce(
        (sum, s) => sum + s._count.registrations,
        0
      );
      const avgAttendanceRate =
        totalExpected > 0 ? Math.round((totalAttendees / totalExpected) * 100) : 0;

      // Users by activity type
      const usersByActivity = await db.user.groupBy({
        by: ["activityType"],
        where: { isActive: true, activityType: { not: null } },
        _count: true,
      });

      // Users by gender
      const usersByGender = await db.user.groupBy({
        by: ["gender"],
        where: { isActive: true, gender: { not: null } },
        _count: true,
      });

      // Registration trends (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const registrations = await db.registration.findMany({
        where: {
          registeredAt: { gte: twelveMonthsAgo },
          isApproved: true,
        },
        select: { registeredAt: true },
      });

      // Group by month
      const monthlyRegistrations: Record<string, number> = {};
      registrations.forEach((r) => {
        const key = `${r.registeredAt.getFullYear()}-${String(r.registeredAt.getMonth() + 1).padStart(2, "0")}`;
        monthlyRegistrations[key] = (monthlyRegistrations[key] || 0) + 1;
      });

      const registrationTrends = Object.entries(monthlyRegistrations)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      // Session performance (all sessions)
      const sessions = await db.session.findMany({
        orderBy: { date: "desc" },
        take: 20,
        include: {
          _count: {
            select: {
              registrations: { where: { isApproved: true } },
              attendances: { where: { attended: true } },
            },
          },
        },
      });

      const sessionPerformance = sessions.map((s) => ({
        id: s.id,
        title: s.title,
        date: s.date,
        registrations: s._count.registrations,
        attendees: s._count.attendances,
        attendanceRate:
          s._count.registrations > 0
            ? Math.round((s._count.attendances / s._count.registrations) * 100)
            : 0,
        fillRate:
          s.maxParticipants > 0
            ? Math.round((s._count.registrations / s.maxParticipants) * 100)
            : 0,
      }));

      // Top attendees
      const topAttendees = await db.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          _count: {
            select: {
              registrations: { where: { isApproved: true } },
            },
          },
          registrations: {
            where: { attendance: { attended: true } },
            select: { id: true },
          },
        },
        orderBy: {
          registrations: { _count: "desc" },
        },
        take: 10,
      });

      // Top companies
      const companies = await db.user.groupBy({
        by: ["companyName"],
        where: { isActive: true, companyName: { not: null } },
        _count: true,
        orderBy: { _count: { companyName: "desc" } },
        take: 10,
      });

      // =====================================================
      // NEW ANALYTICS: Retention (New vs Returning Members)
      // =====================================================
      const usersWithAttendance = await db.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          createdAt: true,
          registrations: {
            where: {
              isApproved: true,
              attendance: { attended: true }
            },
            select: {
              sessionId: true,
              session: { select: { date: true } }
            },
            orderBy: { session: { date: "asc" } },
          },
        },
      });

      // Calculate retention: users who attended more than one session
      const usersWithMultipleSessions = usersWithAttendance.filter(
        (u) => u.registrations.length > 1
      );
      const retentionRate = usersWithAttendance.length > 0
        ? Math.round((usersWithMultipleSessions.length / usersWithAttendance.length) * 100)
        : 0;

      // New vs returning per recent sessions
      const newVsReturning: { sessionTitle: string; newMembers: number; returning: number }[] = [];
      for (const session of sessions.slice(0, 10)) {
        const sessionAttendees = await db.attendance.findMany({
          where: { sessionId: session.id, attended: true },
          include: {
            registration: {
              include: { user: true }
            }
          }
        });

        let newCount = 0;
        let returningCount = 0;

        for (const att of sessionAttendees) {
          if (!att.registration?.userId) {
            newCount++; // Guest is always "new"
            continue;
          }

          // Check if user had any prior attendance
          const priorAttendance = await db.attendance.count({
            where: {
              attended: true,
              registration: {
                userId: att.registration.userId,
                session: { date: { lt: session.date } }
              }
            }
          });

          if (priorAttendance > 0) {
            returningCount++;
          } else {
            newCount++;
          }
        }

        newVsReturning.push({
          sessionTitle: session.title,
          newMembers: newCount,
          returning: returningCount,
        });
      }

      // =====================================================
      // NEW ANALYTICS: Registration Timing
      // =====================================================
      const registrationsWithTiming = await db.registration.findMany({
        where: { isApproved: true },
        select: {
          registeredAt: true,
          session: { select: { date: true } },
        },
      });

      const timingBuckets = {
        sameDay: 0,
        oneDay: 0,
        twoDays: 0,
        threeDays: 0,
        fourToSeven: 0,
        moreThanWeek: 0,
      };

      registrationsWithTiming.forEach((r) => {
        const daysBefore = Math.floor(
          (r.session.date.getTime() - r.registeredAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysBefore <= 0) timingBuckets.sameDay++;
        else if (daysBefore === 1) timingBuckets.oneDay++;
        else if (daysBefore === 2) timingBuckets.twoDays++;
        else if (daysBefore === 3) timingBuckets.threeDays++;
        else if (daysBefore <= 7) timingBuckets.fourToSeven++;
        else timingBuckets.moreThanWeek++;
      });

      const registrationTiming = [
        { label: "نفس اليوم", value: timingBuckets.sameDay },
        { label: "قبل يوم", value: timingBuckets.oneDay },
        { label: "قبل يومين", value: timingBuckets.twoDays },
        { label: "قبل 3 أيام", value: timingBuckets.threeDays },
        { label: "4-7 أيام", value: timingBuckets.fourToSeven },
        { label: "أكثر من أسبوع", value: timingBuckets.moreThanWeek },
      ];

      // =====================================================
      // NEW ANALYTICS: Hosting Breakdown
      // =====================================================
      const hostingUsers = await db.user.findMany({
        where: { wantsToHost: true, isActive: true },
        select: { hostingTypes: true },
      });

      const guestHosting = await db.registration.findMany({
        where: { guestWantsToHost: true },
        select: { guestHostingTypes: true },
      });

      const hostingTypeCounts: Record<string, number> = {};
      hostingUsers.forEach((u) => {
        u.hostingTypes.forEach((type) => {
          hostingTypeCounts[type] = (hostingTypeCounts[type] || 0) + 1;
        });
      });
      guestHosting.forEach((g) => {
        g.guestHostingTypes.forEach((type) => {
          hostingTypeCounts[type] = (hostingTypeCounts[type] || 0) + 1;
        });
      });

      const hostingBreakdown = Object.entries(hostingTypeCounts).map(([type, count]) => ({
        type,
        label: getHostingTypeLabel(type),
        count,
      }));

      const totalHosts = hostingUsers.length + guestHosting.length;

      // =====================================================
      // NEW ANALYTICS: Companion Stats
      // =====================================================
      const registrationsWithCompanions = await db.registration.findMany({
        where: { isApproved: true },
        include: {
          _count: { select: { invitedRegistrations: true } },
        },
      });

      const totalCompanions = registrationsWithCompanions.reduce(
        (sum, r) => sum + r._count.invitedRegistrations,
        0
      );
      const registrationsWithAtLeastOne = registrationsWithCompanions.filter(
        (r) => r._count.invitedRegistrations > 0
      ).length;
      const avgCompanionsPerReg = registrationsWithCompanions.length > 0
        ? (totalCompanions / registrationsWithCompanions.length).toFixed(2)
        : "0";

      // =====================================================
      // NEW ANALYTICS: Growth Metrics (Month over Month)
      // =====================================================
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const newUsersPerMonth = await db.user.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      });

      const userGrowthByMonth: Record<string, number> = {};
      newUsersPerMonth.forEach((u) => {
        const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}`;
        userGrowthByMonth[key] = (userGrowthByMonth[key] || 0) + 1;
      });

      const growthMetrics = Object.entries(userGrowthByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count], index, arr) => {
          const prevCount = index > 0 ? arr[index - 1][1] : count;
          const growthRate = prevCount > 0 ? Math.round(((count - prevCount) / prevCount) * 100) : 0;
          return { month, newUsers: count, growthRate };
        });

      return {
        overview: {
          totalUsers,
          totalSessions,
          totalRegistrations,
          avgAttendanceRate,
        },
        usersByActivity: usersByActivity.map((u) => ({
          name: u.activityType || "غير محدد",
          value: u._count,
        })),
        usersByGender: usersByGender.map((u) => ({
          name: u.gender === "male" ? "ذكر" : u.gender === "female" ? "أنثى" : "غير محدد",
          value: u._count,
        })),
        registrationTrends,
        sessionPerformance,
        topAttendees: topAttendees.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          company: u.companyName,
          sessionsAttended: u.registrations.length,
          totalRegistrations: u._count.registrations,
          attendanceRate:
            u._count.registrations > 0
              ? Math.round((u.registrations.length / u._count.registrations) * 100)
              : 0,
        })),
        topCompanies: companies.map((c) => ({
          name: c.companyName || "غير محدد",
          count: c._count,
        })),
        // New analytics
        retention: {
          totalActiveUsers: usersWithAttendance.length,
          returningUsers: usersWithMultipleSessions.length,
          retentionRate,
          newVsReturning,
        },
        registrationTiming,
        hosting: {
          totalHosts,
          breakdown: hostingBreakdown,
        },
        companions: {
          totalCompanions,
          registrationsWithCompanions: registrationsWithAtLeastOne,
          avgPerRegistration: parseFloat(avgCompanionsPerReg),
        },
        growthMetrics,
      };
    }),

  /**
   * Get all users who want to host (admin only)
   */
  getHosts: adminProcedure
    .input(
      z.object({
        hostingType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        wantsToHost: true,
        isActive: true,
      };

      if (input?.hostingType) {
        where.hostingTypes = { has: input.hostingType };
      }

      const users = await db.user.findMany({
        where,
        take: (input?.limit ?? 50) + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          hostingTypes: true,
          createdAt: true,
        },
      });

      let nextCursor: string | undefined;
      if (users.length > (input?.limit ?? 50)) {
        const nextItem = users.pop();
        nextCursor = nextItem?.id;
      }

      // Also get guest hosts from registrations
      const guestHosts = await db.registration.findMany({
        where: {
          userId: null,
          guestWantsToHost: true,
          ...(input?.hostingType && { guestHostingTypes: { has: input.hostingType } }),
        },
        select: {
          id: true,
          guestName: true,
          guestEmail: true,
          guestPhone: true,
          guestCompanyName: true,
          guestHostingTypes: true,
          registeredAt: true,
        },
        orderBy: { registeredAt: "desc" },
      });

      return {
        users: users.map((u) => ({
          ...u,
          isGuest: false,
        })),
        guestHosts: guestHosts.map((g) => ({
          id: g.id,
          name: g.guestName,
          email: g.guestEmail,
          phone: g.guestPhone,
          companyName: g.guestCompanyName,
          hostingTypes: g.guestHostingTypes,
          createdAt: g.registeredAt,
          isGuest: true,
        })),
        nextCursor,
      };
    }),

  /**
   * Export hosts to CSV (admin only)
   */
  exportHosts: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const users = await db.user.findMany({
      where: { wantsToHost: true, isActive: true },
      select: {
        name: true,
        email: true,
        phone: true,
        companyName: true,
        hostingTypes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Also get guest hosts
    const guestHosts = await db.registration.findMany({
      where: {
        userId: null,
        guestWantsToHost: true,
      },
      select: {
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        guestCompanyName: true,
        guestHostingTypes: true,
      },
      orderBy: { registeredAt: "desc" },
    });

    const data = [
      ...users.map((u) => ({
        الاسم: u.name,
        البريد: u.email,
        الهاتف: u.phone,
        الشركة: u.companyName || "",
        "أنواع الضيافة": u.hostingTypes.map(getHostingTypeLabel).join(", "),
        النوع: "عضو",
      })),
      ...guestHosts.map((g) => ({
        الاسم: g.guestName || "",
        البريد: g.guestEmail || "",
        الهاتف: g.guestPhone || "",
        الشركة: g.guestCompanyName || "",
        "أنواع الضيافة": g.guestHostingTypes.map(getHostingTypeLabel).join(", "),
        النوع: "زائر",
      })),
    ];

    const csv = exportToCSV(data);
    return { csv, count: data.length };
  }),

  /**
   * Create a new host manually (admin only)
   */
  createHost: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "الاسم مطلوب"),
        email: z.string().email("البريد الإلكتروني غير صالح").optional(),
        phone: z.string().min(1, "رقم الهاتف مطلوب"),
        companyName: z.string().optional(),
        hostingTypes: z.array(z.string()).min(1, "يجب اختيار نوع ضيافة واحد على الأقل"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Check if user with same phone already exists
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { phone: input.phone },
            ...(input.email ? [{ email: input.email }] : []),
          ],
        },
      });

      if (existingUser) {
        // Update existing user to mark as host
        const updated = await db.user.update({
          where: { id: existingUser.id },
          data: {
            wantsToHost: true,
            hostingTypes: {
              set: Array.from(new Set([...existingUser.hostingTypes, ...input.hostingTypes])),
            },
          },
        });
        return { user: updated, isNew: false };
      }

      // Create a new user with host preferences
      const username = input.phone.replace(/\D/g, "");
      const user = await db.user.create({
        data: {
          name: input.name,
          email: input.email || `host-${username}@placeholder.local`,
          phone: input.phone,
          username,
          companyName: input.companyName,
          wantsToHost: true,
          hostingTypes: input.hostingTypes,
          isActive: true,
          isApproved: true,
        },
      });

      return { user, isNew: true };
    }),
});
