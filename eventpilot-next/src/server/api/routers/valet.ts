import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  valetProcedure,
} from "../trpc";
import { generateValetToken } from "@/lib/valet-auth";
import {
  sendValetParkedEmail,
  sendValetReadyEmail,
  sendValetBroadcastEmail,
} from "@/lib/email";

// ============================================
// Valet Employee Auth Procedures
// ============================================

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const employeeSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6),
  phone: z.string().optional(),
});

const updateEmployeeSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const sessionConfigSchema = z.object({
  sessionId: z.string(),
  valetEnabled: z.boolean(),
  valetLotCapacity: z.number().int().min(0),
  valetRetrievalNotice: z.number().int().min(1).default(5),
});

const parkVehicleSchema = z.object({
  registrationId: z.string(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleColor: z.string().optional(),
  vehiclePlate: z.string().optional(),
  parkingSlot: z.string().optional(),
});

export const valetRouter = createTRPCRouter({
  // ============================================
  // Auth Procedures (Public)
  // ============================================

  /**
   * Valet employee login - returns JWT token
   */
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const employee = await ctx.db.valetEmployee.findUnique({
      where: { username: input.username.toLowerCase() },
    });

    if (!employee) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "اسم المستخدم أو كلمة المرور غير صحيحة",
      });
    }

    if (!employee.isActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "هذا الحساب غير مفعل",
      });
    }

    const isValid = await bcrypt.compare(input.password, employee.passwordHash);
    if (!isValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "اسم المستخدم أو كلمة المرور غير صحيحة",
      });
    }

    const token = await generateValetToken({
      employeeId: employee.id,
      username: employee.username,
      name: employee.name,
    });

    return {
      token,
      employee: {
        id: employee.id,
        name: employee.name,
        username: employee.username,
      },
    };
  }),

  /**
   * Get current valet employee info
   */
  getMe: valetProcedure.query(async ({ ctx }) => {
    return ctx.valetEmployee;
  }),

  // ============================================
  // Admin Procedures
  // ============================================

  /**
   * Create a new valet employee
   */
  createEmployee: adminProcedure
    .input(employeeSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.valetEmployee.findUnique({
        where: { username: input.username.toLowerCase() },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "اسم المستخدم موجود مسبقاً",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const employee = await ctx.db.valetEmployee.create({
        data: {
          name: input.name,
          username: input.username.toLowerCase(),
          passwordHash,
          phone: input.phone,
        },
      });

      return {
        id: employee.id,
        name: employee.name,
        username: employee.username,
        phone: employee.phone,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
      };
    }),

  /**
   * Update valet employee
   */
  updateEmployee: adminProcedure
    .input(updateEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, password, ...data } = input;

      // Check username uniqueness if changing
      if (data.username) {
        const existing = await ctx.db.valetEmployee.findFirst({
          where: {
            username: data.username.toLowerCase(),
            NOT: { id },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "اسم المستخدم موجود مسبقاً",
          });
        }
      }

      const updateData: Record<string, unknown> = {
        ...data,
        username: data.username?.toLowerCase(),
      };

      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      const employee = await ctx.db.valetEmployee.update({
        where: { id },
        data: updateData,
      });

      return {
        id: employee.id,
        name: employee.name,
        username: employee.username,
        phone: employee.phone,
        isActive: employee.isActive,
      };
    }),

  /**
   * List all valet employees
   */
  listEmployees: adminProcedure.query(async ({ ctx }) => {
    const employees = await ctx.db.valetEmployee.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return employees;
  }),

  /**
   * Delete/deactivate valet employee
   */
  deleteEmployee: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete - just deactivate
      await ctx.db.valetEmployee.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return { success: true };
    }),

  /**
   * Assign employee to session
   */
  assignEmployeeToSession: adminProcedure
    .input(
      z.object({
        employeeId: z.string(),
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already assigned
      const existing = await ctx.db.valetEmployeeSession.findUnique({
        where: {
          employeeId_sessionId: {
            employeeId: input.employeeId,
            sessionId: input.sessionId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "الموظف مسجل مسبقاً لهذا الحدث",
        });
      }

      const assignment = await ctx.db.valetEmployeeSession.create({
        data: {
          employeeId: input.employeeId,
          sessionId: input.sessionId,
          assignedBy: ctx.session.user.id,
        },
        include: {
          employee: {
            select: { id: true, name: true, username: true },
          },
        },
      });

      return assignment;
    }),

  /**
   * Unassign employee from session
   */
  unassignEmployeeFromSession: adminProcedure
    .input(
      z.object({
        employeeId: z.string(),
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.valetEmployeeSession.delete({
        where: {
          employeeId_sessionId: {
            employeeId: input.employeeId,
            sessionId: input.sessionId,
          },
        },
      });

      return { success: true };
    }),

  /**
   * Get all employees assigned to a session
   */
  getSessionEmployees: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.db.valetEmployeeSession.findMany({
        where: { sessionId: input.sessionId },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              username: true,
              phone: true,
              isActive: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      });

      return assignments.map((a) => ({
        ...a.employee,
        assignedAt: a.assignedAt,
      }));
    }),

  /**
   * Get all sessions assigned to current valet employee (for valet portal)
   */
  getMyAssignedSessions: valetProcedure.query(async ({ ctx }) => {
    const assignments = await ctx.db.valetEmployeeSession.findMany({
      where: { employeeId: ctx.valetEmployee.id },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            date: true,
            valetEnabled: true,
            valetLotCapacity: true,
            status: true,
          },
        },
      },
      orderBy: { session: { date: "desc" } },
    });

    // Filter to only active valet-enabled sessions
    return assignments
      .filter((a) => a.session.valetEnabled)
      .map((a) => a.session);
  }),

  /**
   * Get session info for valet employee (verifies assignment)
   */
  getSessionForValet: valetProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify this employee is assigned to this session
      const assignment = await ctx.db.valetEmployeeSession.findUnique({
        where: {
          employeeId_sessionId: {
            employeeId: ctx.valetEmployee.id,
            sessionId: input.sessionId,
          },
        },
        include: {
          session: {
            select: {
              id: true,
              title: true,
              date: true,
              status: true,
              valetEnabled: true,
              valetLotCapacity: true,
              valetRetrievalNotice: true,
            },
          },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "لم يتم العثور على الحدث أو لست مسجلاً له",
        });
      }

      if (!assignment.session.valetEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "خدمة الفاليه غير مفعلة لهذا الحدث",
        });
      }

      return assignment.session;
    }),

  /**
   * Update session valet configuration
   */
  updateSessionConfig: adminProcedure
    .input(sessionConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.session.update({
        where: { id: input.sessionId },
        data: {
          valetEnabled: input.valetEnabled,
          valetLotCapacity: input.valetLotCapacity,
          valetRetrievalNotice: input.valetRetrievalNotice,
        },
      });

      return {
        valetEnabled: session.valetEnabled,
        valetLotCapacity: session.valetLotCapacity,
        valetRetrievalNotice: session.valetRetrievalNotice,
      };
    }),

  /**
   * Get session valet configuration
   */
  getSessionConfig: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.session.findUnique({
        where: { id: input.sessionId },
        select: {
          valetEnabled: true,
          valetLotCapacity: true,
          valetRetrievalNotice: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      return session;
    }),

  /**
   * Mark a guest as VIP for valet priority
   */
  markGuestVip: adminProcedure
    .input(
      z.object({
        registrationId: z.string(),
        isVip: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const valetRecord = await ctx.db.valetRecord.findUnique({
        where: { registrationId: input.registrationId },
      });

      if (!valetRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Valet record not found",
        });
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: valetRecord.id },
        data: {
          isVip: input.isVip,
          retrievalPriority: input.isVip ? 100 : 0,
        },
      });

      return { isVip: updated.isVip };
    }),

  /**
   * Get session valet statistics
   */
  getSessionValetStats: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.session.findUnique({
        where: { id: input.sessionId },
        select: { valetLotCapacity: true },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      const records = await ctx.db.valetRecord.groupBy({
        by: ["status"],
        where: { sessionId: input.sessionId },
        _count: true,
      });

      const stats: Record<string, number> = {
        expected: 0,
        parked: 0,
        requested: 0,
        fetching: 0,
        ready: 0,
        retrieved: 0,
      };

      for (const record of records) {
        stats[record.status] = record._count;
      }

      return {
        ...stats,
        capacity: session.valetLotCapacity,
        currentlyParked:
          stats.parked + stats.requested + stats.fetching + stats.ready,
        inQueue: stats.requested + stats.fetching + stats.ready,
      };
    }),

  /**
   * Get all guests with valet status for a session
   */
  getSessionValetGuests: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const registrations = await ctx.db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          needsValet: true,
          isApproved: true,
          isRejected: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          valetRecord: true,
        },
        orderBy: { registeredAt: "desc" },
      });

      return registrations.map((reg) => ({
        registrationId: reg.id,
        name: reg.user?.name ?? reg.guestName ?? "Unknown",
        phone: reg.user?.phone ?? reg.guestPhone,
        email: reg.user?.email ?? reg.guestEmail,
        valetRecord: reg.valetRecord,
      }));
    }),

  /**
   * Send broadcast message to all valet guests
   */
  sendBroadcast: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.session.findUnique({
        where: { id: input.sessionId },
        select: { title: true },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      const registrations = await ctx.db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          needsValet: true,
          isApproved: true,
          isRejected: false,
        },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });

      let sentCount = 0;
      for (const reg of registrations) {
        const email = reg.user?.email ?? reg.guestEmail;
        const name = reg.user?.name ?? reg.guestName ?? "Guest";

        if (email) {
          try {
            await sendValetBroadcastEmail({
              to: email,
              guestName: name,
              eventName: session.title,
              message: input.message,
            });
            sentCount++;
          } catch (error) {
            console.error(`Failed to send broadcast to ${email}:`, error);
          }
        }
      }

      return { sent: sentCount };
    }),

  /**
   * Get all valet records for a session (admin view)
   */
  getAllRecords: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const records = await ctx.db.valetRecord.findMany({
        where: { sessionId: input.sessionId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
          parkedByEmployee: {
            select: { id: true, name: true },
          },
        },
      });

      return records;
    }),

  /**
   * Admin override: Change valet record status
   */
  adminOverrideStatus: adminProcedure
    .input(
      z.object({
        valetRecordId: z.string(),
        newStatus: z.enum([
          "expected",
          "parked",
          "requested",
          "fetching",
          "ready",
          "retrieved",
        ]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { id: input.valetRecordId },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Valet record not found",
        });
      }

      // Set appropriate timestamps based on new status
      const timestamps: Record<string, Date | null> = {};
      if (input.newStatus === "parked" && !record.parkedAt) {
        timestamps.parkedAt = new Date();
      }
      if (input.newStatus === "requested" && !record.retrievalRequestedAt) {
        timestamps.retrievalRequestedAt = new Date();
      }
      if (input.newStatus === "fetching" && !record.fetchingStartedAt) {
        timestamps.fetchingStartedAt = new Date();
      }
      if (input.newStatus === "ready" && !record.vehicleReadyAt) {
        timestamps.vehicleReadyAt = new Date();
      }
      if (input.newStatus === "retrieved" && !record.retrievedAt) {
        timestamps.retrievedAt = new Date();
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: input.valetRecordId },
        data: {
          status: input.newStatus,
          ...timestamps,
          lastAdminActionAt: new Date(),
          lastAdminActionBy: ctx.session.user.id,
          lastAdminActionType: "status_override",
          lastAdminActionReason: input.reason,
        },
      });

      return updated;
    }),

  /**
   * Admin override: Toggle VIP status
   */
  adminOverrideVip: adminProcedure
    .input(
      z.object({
        valetRecordId: z.string(),
        isVip: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { id: input.valetRecordId },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Valet record not found",
        });
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: input.valetRecordId },
        data: {
          isVip: input.isVip,
          retrievalPriority: input.isVip ? 100 : 0,
          lastAdminActionAt: new Date(),
          lastAdminActionBy: ctx.session.user.id,
          lastAdminActionType: "vip_toggle",
        },
      });

      return { isVip: updated.isVip };
    }),

  /**
   * Admin: Update vehicle details
   */
  adminUpdateVehicleDetails: adminProcedure
    .input(
      z.object({
        valetRecordId: z.string(),
        vehicleMake: z.string().optional(),
        vehicleModel: z.string().optional(),
        vehicleColor: z.string().optional(),
        vehiclePlate: z.string().optional(),
        parkingSlot: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { valetRecordId, ...vehicleData } = input;

      const record = await ctx.db.valetRecord.findUnique({
        where: { id: valetRecordId },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Valet record not found",
        });
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: valetRecordId },
        data: {
          ...vehicleData,
          lastAdminActionAt: new Date(),
          lastAdminActionBy: ctx.session.user.id,
          lastAdminActionType: "details_update",
        },
      });

      return updated;
    }),

  // ============================================
  // Valet Employee Procedures
  // ============================================

  /**
   * Search guests by name, phone, email, or ticket number for a session
   */
  searchGuests: valetProcedure
    .input(
      z.object({
        sessionId: z.string(),
        query: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if query is a ticket number
      const ticketNumber = parseInt(input.query, 10);
      const isTicketSearch = !isNaN(ticketNumber) && ticketNumber > 0;

      // If searching by ticket number, find the valet record directly
      if (isTicketSearch) {
        const valetRecord = await ctx.db.valetRecord.findFirst({
          where: {
            sessionId: input.sessionId,
            ticketNumber: ticketNumber,
          },
          include: {
            registration: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        if (valetRecord) {
          const reg = valetRecord.registration;
          return [
            {
              registrationId: reg.id,
              name: reg.user?.name ?? reg.guestName ?? "Unknown",
              phone: reg.user?.phone ?? reg.guestPhone,
              email: reg.user?.email ?? reg.guestEmail,
              valetStatus: valetRecord.status,
              isVip: valetRecord.isVip,
              ticketNumber: valetRecord.ticketNumber,
              vehicleMake: valetRecord.vehicleMake,
              vehicleModel: valetRecord.vehicleModel,
              vehicleColor: valetRecord.vehicleColor,
              vehiclePlate: valetRecord.vehiclePlate,
              parkingSlot: valetRecord.parkingSlot,
            },
          ];
        }
      }

      // Search by name, phone, or email
      const registrations = await ctx.db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          needsValet: true,
          isApproved: true,
          isRejected: false,
          OR: [
            // Search by name (user or guest)
            {
              user: {
                name: { contains: input.query, mode: "insensitive" },
              },
            },
            {
              guestName: { contains: input.query, mode: "insensitive" },
            },
            // Search by phone with all variations
            ...phoneConditions,
            // Search by email (user or guest)
            {
              user: {
                email: { contains: input.query, mode: "insensitive" },
              },
            },
            {
              guestEmail: { contains: input.query, mode: "insensitive" },
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          valetRecord: true,
        },
        take: 15,
      });

      return registrations.map((reg) => ({
        registrationId: reg.id,
        name: reg.user?.name ?? reg.guestName ?? "Unknown",
        phone: reg.user?.phone ?? reg.guestPhone,
        email: reg.user?.email ?? reg.guestEmail,
        valetStatus: reg.valetRecord?.status ?? null,
        isVip: reg.valetRecord?.isVip ?? false,
        ticketNumber: reg.valetRecord?.ticketNumber ?? null,
        vehicleMake: reg.valetRecord?.vehicleMake ?? null,
        vehicleModel: reg.valetRecord?.vehicleModel ?? null,
        vehicleColor: reg.valetRecord?.vehicleColor ?? null,
        vehiclePlate: reg.valetRecord?.vehiclePlate ?? null,
        parkingSlot: reg.valetRecord?.parkingSlot ?? null,
      }));
    }),

  /**
   * Get guest info by QR code scan
   */
  getGuestByQR: valetProcedure
    .input(z.object({ qrData: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // QR data format: "checkin:{registrationId}" or just registrationId
      let registrationId = input.qrData;
      if (input.qrData.startsWith("checkin:")) {
        registrationId = input.qrData.replace("checkin:", "");
      }

      const registration = await ctx.db.registration.findUnique({
        where: { id: registrationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          valetRecord: true,
          session: {
            select: {
              id: true,
              valetEnabled: true,
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

      if (!registration.session.valetEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "خدمة الفاليه غير متاحة لهذا الحدث",
        });
      }

      if (!registration.needsValet) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "هذا الضيف لم يطلب خدمة الفاليه",
        });
      }

      return {
        registrationId: registration.id,
        sessionId: registration.session.id,
        name: registration.user?.name ?? registration.guestName ?? "Unknown",
        phone: registration.user?.phone ?? registration.guestPhone,
        valetRecord: registration.valetRecord,
      };
    }),

  /**
   * Get valet record details
   */
  getValetRecord: valetProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { registrationId: input.registrationId },
        include: {
          parkedByEmployee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return record;
    }),

  /**
   * Park a vehicle
   */
  parkVehicle: valetProcedure
    .input(parkVehicleSchema)
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          user: {
            select: { name: true, phone: true, email: true },
          },
          session: {
            select: {
              id: true,
              title: true,
              valetEnabled: true,
              valetLotCapacity: true,
            },
          },
          valetRecord: true,
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التسجيل غير موجود",
        });
      }

      if (!registration.session.valetEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "VALET_NOT_ENABLED",
        });
      }

      // Check capacity
      const parkedCount = await ctx.db.valetRecord.count({
        where: {
          sessionId: registration.session.id,
          status: { in: ["parked", "requested", "ready"] },
        },
      });

      if (parkedCount >= registration.session.valetLotCapacity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CAPACITY_FULL",
        });
      }

      const guestName =
        registration.user?.name ?? registration.guestName ?? "Unknown";
      const guestPhone = registration.user?.phone ?? registration.guestPhone;
      const guestEmail = registration.user?.email ?? registration.guestEmail;

      // Get next ticket number for this session (starts from 1)
      const lastTicket = await ctx.db.valetRecord.findFirst({
        where: {
          sessionId: registration.session.id,
          ticketNumber: { not: null },
        },
        orderBy: { ticketNumber: "desc" },
        select: { ticketNumber: true },
      });
      const nextTicketNumber = (lastTicket?.ticketNumber ?? 0) + 1;

      // Generate unique tracking token for public access
      const trackingToken = crypto.randomUUID();

      let valetRecord;

      if (registration.valetRecord) {
        // Update existing record
        if (registration.valetRecord.status !== "expected") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "ALREADY_PARKED",
          });
        }

        valetRecord = await ctx.db.valetRecord.update({
          where: { id: registration.valetRecord.id },
          data: {
            ticketNumber:
              registration.valetRecord.ticketNumber ?? nextTicketNumber,
            trackingToken:
              registration.valetRecord.trackingToken ?? trackingToken,
            vehicleMake: input.vehicleMake,
            vehicleModel: input.vehicleModel,
            vehicleColor: input.vehicleColor,
            vehiclePlate: input.vehiclePlate,
            parkingSlot: input.parkingSlot,
            status: "parked",
            parkedAt: new Date(),
            parkedByEmployeeId: ctx.valetEmployee.id,
          },
        });
      } else {
        // Create new record
        valetRecord = await ctx.db.valetRecord.create({
          data: {
            registrationId: input.registrationId,
            sessionId: registration.session.id,
            guestName,
            guestPhone,
            ticketNumber: nextTicketNumber,
            trackingToken,
            vehicleMake: input.vehicleMake,
            vehicleModel: input.vehicleModel,
            vehicleColor: input.vehicleColor,
            vehiclePlate: input.vehiclePlate,
            parkingSlot: input.parkingSlot,
            status: "parked",
            parkedAt: new Date(),
            parkedByEmployeeId: ctx.valetEmployee.id,
          },
        });
      }

      // Send notification email with tracking link
      if (guestEmail) {
        const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
        const trackingUrl = `${baseUrl}/valet/track/${valetRecord.trackingToken}`;

        try {
          await sendValetParkedEmail({
            to: guestEmail,
            guestName,
            eventName: registration.session.title,
            vehicleInfo: `${input.vehicleColor ?? ""} ${
              input.vehicleMake ?? ""
            } ${input.vehicleModel ?? ""}`.trim(),
            parkingSlot: input.parkingSlot ?? "N/A",
            ticketNumber: valetRecord.ticketNumber ?? undefined,
            trackingUrl,
          });
        } catch (error) {
          console.error("Failed to send valet parked email:", error);
        }
      }

      return valetRecord;
    }),

  /**
   * Get retrieval queue for a session
   */
  getRetrievalQueue: valetProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const queue = await ctx.db.valetRecord.findMany({
        where: {
          sessionId: input.sessionId,
          status: { in: ["requested", "fetching", "ready"] },
        },
        orderBy: [
          { retrievalPriority: "desc" },
          { retrievalRequestedAt: "asc" },
        ],
      });

      return queue;
    }),

  /**
   * Get valet stats for a session (for valet employees)
   */
  getValetStats: valetProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.session.findUnique({
        where: { id: input.sessionId },
        select: { valetLotCapacity: true },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      const records = await ctx.db.valetRecord.groupBy({
        by: ["status"],
        where: { sessionId: input.sessionId },
        _count: true,
      });

      const stats: Record<string, number> = {
        expected: 0,
        parked: 0,
        requested: 0,
        fetching: 0,
        ready: 0,
        retrieved: 0,
      };

      for (const record of records) {
        stats[record.status] = record._count;
      }

      return {
        ...stats,
        capacity: session.valetLotCapacity,
        currentlyParked:
          stats.parked + stats.requested + stats.fetching + stats.ready,
        inQueue: stats.requested + stats.fetching + stats.ready,
      };
    }),

  /**
   * Mark vehicle as being fetched (valet is getting the car)
   */
  markVehicleFetching: valetProcedure
    .input(z.object({ valetRecordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { id: input.valetRecordId },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Valet record not found",
        });
      }

      if (record.status !== "requested") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vehicle is not in requested status",
        });
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: input.valetRecordId },
        data: {
          status: "fetching",
          fetchingStartedAt: new Date(),
        },
      });

      return updated;
    }),

  /**
   * Mark vehicle as ready for pickup
   */
  markVehicleReady: valetProcedure
    .input(z.object({ valetRecordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { id: input.valetRecordId },
        include: {
          registration: {
            include: {
              user: { select: { email: true } },
              session: { select: { title: true } },
            },
          },
        },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Valet record not found",
        });
      }

      if (record.status !== "requested" && record.status !== "fetching") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vehicle is not in requested or fetching status",
        });
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: input.valetRecordId },
        data: {
          status: "ready",
          vehicleReadyAt: new Date(),
        },
      });

      // Send notification
      const email =
        record.registration.user?.email ?? record.registration.guestEmail;
      if (email) {
        try {
          await sendValetReadyEmail({
            to: email,
            guestName: record.guestName,
            eventName: record.registration.session.title,
            vehicleInfo: `${record.vehicleColor ?? ""} ${
              record.vehicleMake ?? ""
            } ${record.vehicleModel ?? ""}`.trim(),
          });
        } catch (error) {
          console.error("Failed to send valet ready email:", error);
        }
      }

      return updated;
    }),

  /**
   * Mark vehicle as retrieved (complete)
   */
  markVehicleRetrieved: valetProcedure
    .input(z.object({ valetRecordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { id: input.valetRecordId },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Valet record not found",
        });
      }

      if (record.status !== "ready") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vehicle is not marked as ready",
        });
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: input.valetRecordId },
        data: {
          status: "retrieved",
          retrievedAt: new Date(),
        },
      });

      return updated;
    }),

  // ============================================
  // Guest/Public Procedures
  // ============================================

  /**
   * Valet requests car retrieval on behalf of guest (when guest comes to station)
   */
  valetRequestRetrieval: valetProcedure
    .input(z.object({ registrationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { registrationId: input.registrationId },
        include: {
          session: { select: { id: true } },
        },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "سجل الفاليه غير موجود",
        });
      }

      if (record.status === "expected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "السيارة لم يتم ركنها بعد",
        });
      }

      if (record.status === "requested" || record.status === "ready") {
        // Already in queue - just return success
        return {
          status: record.status,
          ticketNumber: record.ticketNumber,
          message: "السيارة في طابور الاسترجاع",
        };
      }

      if (record.status === "retrieved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تم استلام السيارة مسبقاً",
        });
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: record.id },
        data: {
          status: "requested",
          retrievalRequestedAt: new Date(),
          retrievalPriority: record.isVip ? 100 : 0,
        },
      });

      return {
        status: updated.status,
        ticketNumber: updated.ticketNumber,
        message: "تم طلب استرجاع السيارة",
      };
    }),

  /**
   * Admin requests car retrieval on behalf of guest
   */
  adminRequestRetrieval: adminProcedure
    .input(z.object({ registrationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { registrationId: input.registrationId },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "سجل الفاليه غير موجود",
        });
      }

      if (record.status === "expected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "السيارة لم يتم ركنها بعد",
        });
      }

      if (record.status === "requested" || record.status === "ready") {
        return {
          status: record.status,
          ticketNumber: record.ticketNumber,
          message: "السيارة في طابور الاسترجاع",
        };
      }

      if (record.status === "retrieved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تم استلام السيارة مسبقاً",
        });
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: record.id },
        data: {
          status: "requested",
          retrievalRequestedAt: new Date(),
          retrievalPriority: record.isVip ? 100 : 0,
          lastAdminActionAt: new Date(),
          lastAdminActionBy: ctx.session.user.id,
          lastAdminActionType: "retrieval_request",
        },
      });

      return {
        status: updated.status,
        ticketNumber: updated.ticketNumber,
        message: "تم طلب استرجاع السيارة",
      };
    }),

  /**
   * Guest requests car retrieval (by registration ID - legacy)
   */
  requestRetrieval: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { registrationId: input.registrationId },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "GUEST_NOT_FOUND",
        });
      }

      if (record.status === "expected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "NOT_PARKED",
        });
      }

      if (record.status === "requested" || record.status === "ready") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ALREADY_REQUESTED",
        });
      }

      if (record.status === "retrieved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already retrieved",
        });
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: record.id },
        data: {
          status: "requested",
          retrievalRequestedAt: new Date(),
          retrievalPriority: record.isVip ? 100 : 0,
        },
      });

      return {
        status: updated.status,
        message: "تم طلب استرجاع السيارة",
      };
    }),

  /**
   * Get valet status by tracking token (public)
   */
  getStatusByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { trackingToken: input.token },
        include: {
          session: {
            select: {
              id: true,
              title: true,
              date: true,
              valetRetrievalNotice: true,
            },
          },
        },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "INVALID_TOKEN",
        });
      }

      // Get queue position if in retrieval queue
      let queuePosition: number | null = null;
      let estimatedWaitMinutes: number | null = null;

      if (record.status === "requested") {
        // Count how many cars are ahead in the queue
        const aheadInQueue = await ctx.db.valetRecord.count({
          where: {
            sessionId: record.sessionId,
            status: "requested",
            OR: [
              // Higher priority
              { retrievalPriority: { gt: record.retrievalPriority } },
              // Same priority but earlier request
              {
                retrievalPriority: record.retrievalPriority,
                retrievalRequestedAt: { lt: record.retrievalRequestedAt },
              },
            ],
          },
        });

        queuePosition = aheadInQueue + 1;
        // Estimate ~3-5 minutes per car (use retrieval notice as base)
        estimatedWaitMinutes =
          (aheadInQueue + 1) * (record.session.valetRetrievalNotice || 5);
      }

      return {
        status: record.status,
        guestName: record.guestName,
        ticketNumber: record.ticketNumber,
        vehicleMake: record.vehicleMake,
        vehicleModel: record.vehicleModel,
        vehicleColor: record.vehicleColor,
        vehiclePlate: record.vehiclePlate,
        parkingSlot: record.parkingSlot,
        isVip: record.isVip,
        parkedAt: record.parkedAt,
        retrievalRequestedAt: record.retrievalRequestedAt,
        vehicleReadyAt: record.vehicleReadyAt,
        retrievedAt: record.retrievedAt,
        queuePosition,
        estimatedWaitMinutes,
        session: {
          title: record.session.title,
          date: record.session.date,
        },
      };
    }),

  /**
   * Request retrieval by tracking token (public)
   */
  requestRetrievalByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.valetRecord.findUnique({
        where: { trackingToken: input.token },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "INVALID_TOKEN",
        });
      }

      if (record.status === "expected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "NOT_PARKED",
        });
      }

      if (record.status === "requested" || record.status === "ready") {
        // Already in queue, get position
        const aheadInQueue = await ctx.db.valetRecord.count({
          where: {
            sessionId: record.sessionId,
            status: "requested",
            OR: [
              { retrievalPriority: { gt: record.retrievalPriority } },
              {
                retrievalPriority: record.retrievalPriority,
                retrievalRequestedAt: { lt: record.retrievalRequestedAt },
              },
            ],
          },
        });

        return {
          status: record.status,
          ticketNumber: record.ticketNumber,
          queuePosition: aheadInQueue + 1,
          message: "السيارة في طابور الاسترجاع",
        };
      }

      if (record.status === "retrieved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ALREADY_RETRIEVED",
        });
      }

      const updated = await ctx.db.valetRecord.update({
        where: { id: record.id },
        data: {
          status: "requested",
          retrievalRequestedAt: new Date(),
          retrievalPriority: record.isVip ? 100 : 0,
        },
      });

      return {
        status: updated.status,
        ticketNumber: updated.ticketNumber,
        queuePosition: 1,
        message: "تم طلب استرجاع السيارة",
      };
    }),

  /**
   * Get valet status for authenticated user's registration
   */
  getMyValetStatus: protectedProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const registration = await ctx.db.registration.findUnique({
        where: { id: input.registrationId },
        include: {
          valetRecord: true,
          session: {
            select: {
              title: true,
              valetEnabled: true,
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      // Verify ownership
      if (registration.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return {
        needsValet: registration.needsValet,
        valetEnabled: registration.session.valetEnabled,
        valetRecord: registration.valetRecord,
      };
    }),
});
