import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { normalizeArabic } from "@/lib/search";
import { sendEmail } from "@/lib/email";
import {
  createEmailTemplate,
  replacePlaceholders,
  type EmailSettings,
} from "@/lib/email-templates";
import { db as prismaDb } from "@/server/db";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getEmailSettings(): Promise<EmailSettings> {
  const settings = await prismaDb.settings.findUnique({
    where: { key: "global" },
    select: {
      siteName: true,
      contactEmail: true,
      contactPhone: true,
      twitterHandle: true,
      instagramHandle: true,
      snapchatHandle: true,
      linkedinUrl: true,
      whatsappNumber: true,
    },
  });

  return {
    siteName: settings?.siteName ?? null,
    contactEmail: settings?.contactEmail ?? null,
    contactPhone: settings?.contactPhone ?? null,
    twitterHandle: settings?.twitterHandle ?? null,
    instagramHandle: settings?.instagramHandle ?? null,
    snapchatHandle: settings?.snapchatHandle ?? null,
    linkedinUrl: settings?.linkedinUrl ?? null,
    whatsappNumber: settings?.whatsappNumber ?? null,
  };
}

// =============================================================================
// ROUTER
// =============================================================================

export const bulkEmailRouter = createTRPCRouter({
  /**
   * Get users for bulk email with comprehensive filtering
   */
  getUsersForBulkEmail: adminProcedure
    .input(
      z.object({
        // General filters
        search: z.string().optional(),
        roleFilter: z.enum(["all", "USER", "GUEST"]).default("all"),
        labelIds: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),

        // Session-based filters
        sessionId: z.string().optional(),
        registrationStatus: z.enum(["all", "registered", "not_registered"]).optional(),
        approvalStatus: z.enum(["all", "approved", "pending"]).optional(),
        attendanceStatus: z.enum(["all", "attended", "not_attended"]).optional(),

        limit: z.number().min(1).max(500).default(100),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Build where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      // Role filter
      if (input.roleFilter !== "all") {
        where.role = input.roleFilter;
      } else {
        // Only USER and GUEST for bulk emails (exclude admins)
        where.role = { in: ["USER", "GUEST"] };
      }

      // Active status filter
      if (input.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      // Search filter
      if (input.search) {
        const normalizedSearch = normalizeArabic(input.search);
        where.OR = [
          { name: { contains: normalizedSearch, mode: "insensitive" } },
          { email: { contains: normalizedSearch, mode: "insensitive" } },
          { phone: { contains: normalizedSearch, mode: "insensitive" } },
          { companyName: { contains: normalizedSearch, mode: "insensitive" } },
        ];
      }

      // Labels filter
      if (input.labelIds && input.labelIds.length > 0) {
        where.labels = {
          some: {
            id: { in: input.labelIds },
          },
        };
      }

      // Session-based filters
      if (input.sessionId) {
        // Registration status
        if (input.registrationStatus === "registered") {
          where.registrations = {
            some: {
              sessionId: input.sessionId,
              ...(input.approvalStatus === "approved" && { isApproved: true }),
              ...(input.approvalStatus === "pending" && { isApproved: false }),
            },
          };
        } else if (input.registrationStatus === "not_registered") {
          where.registrations = {
            none: {
              sessionId: input.sessionId,
            },
          };
        }

        // Attendance status (only applicable if registered)
        if (input.attendanceStatus === "attended") {
          where.registrations = {
            some: {
              sessionId: input.sessionId,
              attendance: {
                attended: true,
              },
            },
          };
        } else if (input.attendanceStatus === "not_attended") {
          where.registrations = {
            some: {
              sessionId: input.sessionId,
              OR: [
                { attendance: null },
                { attendance: { attended: false } },
              ],
            },
          };
        }
      }

      const users = await db.user.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          position: true,
          role: true,
          isActive: true,
          labels: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (users.length > input.limit) {
        const nextItem = users.pop();
        nextCursor = nextItem?.id;
      }

      return {
        users,
        nextCursor,
      };
    }),

  /**
   * Get total count of users matching filters (for UI display)
   */
  getUserCount: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        roleFilter: z.enum(["all", "USER", "GUEST"]).default("all"),
        labelIds: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
        sessionId: z.string().optional(),
        registrationStatus: z.enum(["all", "registered", "not_registered"]).optional(),
        approvalStatus: z.enum(["all", "approved", "pending"]).optional(),
        attendanceStatus: z.enum(["all", "attended", "not_attended"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      if (input.roleFilter !== "all") {
        where.role = input.roleFilter;
      } else {
        where.role = { in: ["USER", "GUEST"] };
      }

      if (input.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input.search) {
        const normalizedSearch = normalizeArabic(input.search);
        where.OR = [
          { name: { contains: normalizedSearch, mode: "insensitive" } },
          { email: { contains: normalizedSearch, mode: "insensitive" } },
          { phone: { contains: normalizedSearch, mode: "insensitive" } },
          { companyName: { contains: normalizedSearch, mode: "insensitive" } },
        ];
      }

      if (input.labelIds && input.labelIds.length > 0) {
        where.labels = {
          some: {
            id: { in: input.labelIds },
          },
        };
      }

      if (input.sessionId) {
        if (input.registrationStatus === "registered") {
          where.registrations = {
            some: {
              sessionId: input.sessionId,
              ...(input.approvalStatus === "approved" && { isApproved: true }),
              ...(input.approvalStatus === "pending" && { isApproved: false }),
            },
          };
        } else if (input.registrationStatus === "not_registered") {
          where.registrations = {
            none: {
              sessionId: input.sessionId,
            },
          };
        }

        if (input.attendanceStatus === "attended") {
          where.registrations = {
            some: {
              sessionId: input.sessionId,
              attendance: { attended: true },
            },
          };
        } else if (input.attendanceStatus === "not_attended") {
          where.registrations = {
            some: {
              sessionId: input.sessionId,
              OR: [
                { attendance: null },
                { attendance: { attended: false } },
              ],
            },
          };
        }
      }

      return db.user.count({ where });
    }),

  /**
   * Send bulk emails to selected users
   */
  sendBulkEmail: adminProcedure
    .input(
      z.object({
        userIds: z.array(z.string()).min(1),
        subject: z.string().min(1),
        htmlContent: z.string().min(1),
        attachments: z
          .array(
            z.object({
              filename: z.string(),
              content: z.string(), // base64 encoded
            })
          )
          .optional(),
        // Optional: Send to a specific email for testing (uses first user for placeholders)
        testEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get all selected users (for placeholder data)
      const users = await db.user.findMany({
        where: {
          id: { in: input.userIds },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          position: true,
        },
      });

      if (users.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لم يتم العثور على مستخدمين",
        });
      }

      // If testEmail is provided, only send to that email using the first user's data for placeholders
      if (input.testEmail) {
        const sampleUser = users[0]!;
        const settings = await getEmailSettings();

        const personalizedContent = replacePlaceholders(input.htmlContent, {
          name: sampleUser.name,
          email: sampleUser.email,
          companyName: sampleUser.companyName ?? undefined,
          position: sampleUser.position ?? undefined,
          phone: sampleUser.phone,
        });

        const personalizedSubject = replacePlaceholders(input.subject, {
          name: sampleUser.name,
          email: sampleUser.email,
          companyName: sampleUser.companyName ?? undefined,
          position: sampleUser.position ?? undefined,
          phone: sampleUser.phone,
        });

        const html = createEmailTemplate({
          content: personalizedContent,
          settings,
        });

        const success = await sendEmail({
          to: input.testEmail,
          subject: personalizedSubject,
          html,
          text: personalizedContent.replace(/<[^>]*>/g, ""),
          attachments: input.attachments,
          type: "bulk",
        });

        return {
          sentCount: success ? 1 : 0,
          failedCount: success ? 0 : 1,
          totalCount: 1,
          errors: success ? [] : [`فشل إرسال البريد إلى ${input.testEmail}`],
        };
      }

      // Get email settings for template
      const settings = await getEmailSettings();

      let sentCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Send emails one by one with placeholder replacement
      for (const user of users) {
        try {
          // Replace placeholders in content
          const personalizedContent = replacePlaceholders(input.htmlContent, {
            name: user.name,
            email: user.email,
            companyName: user.companyName ?? undefined,
            position: user.position ?? undefined,
            phone: user.phone,
          });

          // Replace placeholders in subject
          const personalizedSubject = replacePlaceholders(input.subject, {
            name: user.name,
            email: user.email,
            companyName: user.companyName ?? undefined,
            position: user.position ?? undefined,
            phone: user.phone,
          });

          // Wrap content with branded template
          const html = createEmailTemplate({
            content: personalizedContent,
            settings,
          });

          // Send email
          const success = await sendEmail({
            to: user.email,
            subject: personalizedSubject,
            html,
            text: personalizedContent.replace(/<[^>]*>/g, ""), // Strip HTML for text version
            attachments: input.attachments,
            type: "bulk",
          });

          if (success) {
            sentCount++;
          } else {
            failedCount++;
            errors.push(`فشل إرسال البريد إلى ${user.email}`);
          }
        } catch (error) {
          failedCount++;
          errors.push(`خطأ في إرسال البريد إلى ${user.email}: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
        }
      }

      return {
        sentCount,
        failedCount,
        totalCount: users.length,
        errors: errors.slice(0, 10), // Limit errors to first 10
      };
    }),

  /**
   * Preview email with placeholder replacement
   */
  previewEmail: adminProcedure
    .input(
      z.object({
        htmlContent: z.string(),
        subject: z.string(),
        sampleUserId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get sample user or use placeholder data
      let userData = {
        name: "أحمد محمد",
        email: "ahmed@example.com",
        companyName: "شركة المثال",
        position: "مدير التسويق",
        phone: "0512345678",
      };

      if (input.sampleUserId) {
        const user = await db.user.findUnique({
          where: { id: input.sampleUserId },
          select: {
            name: true,
            email: true,
            companyName: true,
            position: true,
            phone: true,
          },
        });

        if (user) {
          userData = {
            name: user.name,
            email: user.email,
            companyName: user.companyName ?? "غير محدد",
            position: user.position ?? "غير محدد",
            phone: user.phone,
          };
        }
      }

      // Replace placeholders
      const personalizedContent = replacePlaceholders(input.htmlContent, userData);
      const personalizedSubject = replacePlaceholders(input.subject, userData);

      // Get settings and create full template
      const settings = await getEmailSettings();
      const html = createEmailTemplate({
        content: personalizedContent,
        settings,
      });

      return {
        subject: personalizedSubject,
        html,
        sampleUser: userData,
      };
    }),

  // ==========================================================================
  // DRAFTS
  // ==========================================================================

  /**
   * Save or update a draft
   */
  saveDraft: adminProcedure
    .input(
      z.object({
        id: z.string().optional(), // If provided, updates existing draft
        name: z.string().min(1),
        subject: z.string().optional(),
        content: z.string().optional(),
        filters: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      if (input.id) {
        // Update existing draft
        const existing = await db.emailDraft.findUnique({
          where: { id: input.id },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المسودة غير موجودة",
          });
        }

        return db.emailDraft.update({
          where: { id: input.id },
          data: {
            name: input.name,
            subject: input.subject,
            content: input.content,
            filters: input.filters as object | undefined,
          },
        });
      }

      // Create new draft
      return db.emailDraft.create({
        data: {
          name: input.name,
          subject: input.subject,
          content: input.content,
          filters: input.filters as object | undefined,
          createdById: session.user.id,
        },
      });
    }),

  /**
   * Get all drafts
   */
  getDrafts: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.emailDraft.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        subject: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });
  }),

  /**
   * Get a single draft by ID
   */
  getDraft: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const draft = await ctx.db.emailDraft.findUnique({
        where: { id: input.id },
      });

      if (!draft) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المسودة غير موجودة",
        });
      }

      return draft;
    }),

  /**
   * Delete a draft
   */
  deleteDraft: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.emailDraft.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  /**
   * Save or update a template
   */
  saveTemplate: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        subject: z.string().min(1),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      if (input.id) {
        // Check if template exists and is editable
        const existing = await db.emailTemplate.findUnique({
          where: { id: input.id },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "القالب غير موجود",
          });
        }

        // System templates can be edited but type/isSystem cannot change
        return db.emailTemplate.update({
          where: { id: input.id },
          data: {
            name: existing.isSystem ? existing.name : input.name,
            subject: input.subject,
            content: input.content,
          },
        });
      }

      // Create new custom template
      return db.emailTemplate.create({
        data: {
          name: input.name,
          subject: input.subject,
          content: input.content,
          type: "custom",
          isSystem: false,
          createdById: session.user.id,
        },
      });
    }),

  /**
   * Get all templates
   */
  getTemplates: adminProcedure
    .input(
      z.object({
        type: z.string().optional(), // Filter by type
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.emailTemplate.findMany({
        where: input?.type ? { type: input.type } : undefined,
        orderBy: [
          { isSystem: "desc" }, // System templates first
          { updatedAt: "desc" },
        ],
        select: {
          id: true,
          name: true,
          subject: true,
          type: true,
          isSystem: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: {
              name: true,
            },
          },
        },
      });
    }),

  /**
   * Get a single template by ID
   */
  getTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.emailTemplate.findUnique({
        where: { id: input.id },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "القالب غير موجود",
        });
      }

      return template;
    }),

  /**
   * Delete a template (only custom templates can be deleted)
   */
  deleteTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.emailTemplate.findUnique({
        where: { id: input.id },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "القالب غير موجود",
        });
      }

      if (template.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكن حذف قوالب النظام",
        });
      }

      await ctx.db.emailTemplate.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ==========================================================================
  // CAMPAIGNS
  // ==========================================================================

  /**
   * Create a new campaign (draft state)
   */
  createCampaign: adminProcedure
    .input(
      z.object({
        name: z.string().optional(),
        subject: z.string().min(1),
        content: z.string().min(1),
        recipientUserIds: z.array(z.string()).min(1),
        attachments: z
          .array(
            z.object({
              filename: z.string(),
              content: z.string(),
            })
          )
          .optional(),
        recipientFilters: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get user details for recipients
      const users = await db.user.findMany({
        where: { id: { in: input.recipientUserIds } },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (users.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لم يتم العثور على مستخدمين",
        });
      }

      // Create campaign with recipients
      const campaign = await db.emailCampaign.create({
        data: {
          name: input.name,
          subject: input.subject,
          content: input.content,
          totalRecipients: users.length,
          status: "draft",
          attachments: input.attachments as object | undefined,
          recipientFilters: input.recipientFilters as object | undefined,
          createdById: session.user.id,
          recipients: {
            create: users.map((user) => ({
              userId: user.id,
              email: user.email,
              name: user.name,
              status: "pending",
            })),
          },
        },
        include: {
          _count: {
            select: { recipients: true },
          },
        },
      });

      return campaign;
    }),

  /**
   * Send a campaign (triggers email sending)
   */
  sendCampaign: adminProcedure
    .input(z.object({ campaignId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get campaign with recipients
      const campaign = await db.emailCampaign.findUnique({
        where: { id: input.campaignId },
        include: {
          recipients: {
            where: { status: "pending" },
            select: {
              id: true,
              userId: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحملة غير موجودة",
        });
      }

      if (campaign.status === "sending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الحملة قيد الإرسال بالفعل",
        });
      }

      // Update campaign status to sending
      await db.emailCampaign.update({
        where: { id: campaign.id },
        data: {
          status: "sending",
          sentAt: new Date(),
        },
      });

      // Get email settings
      const settings = await getEmailSettings();

      let sentCount = 0;
      let failedCount = 0;

      // Get user data for personalization
      const userIds = campaign.recipients
        .filter((r) => r.userId)
        .map((r) => r.userId as string);

      const usersData = await db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          position: true,
          phone: true,
        },
      });

      const usersMap = new Map(usersData.map((u) => [u.id, u]));

      // Send emails
      for (const recipient of campaign.recipients) {
        try {
          const userData = recipient.userId ? usersMap.get(recipient.userId) : null;

          const personalizedContent = replacePlaceholders(campaign.content, {
            name: userData?.name ?? recipient.name ?? "",
            email: userData?.email ?? recipient.email,
            companyName: userData?.companyName ?? undefined,
            position: userData?.position ?? undefined,
            phone: userData?.phone ?? undefined,
          });

          const personalizedSubject = replacePlaceholders(campaign.subject, {
            name: userData?.name ?? recipient.name ?? "",
            email: userData?.email ?? recipient.email,
            companyName: userData?.companyName ?? undefined,
            position: userData?.position ?? undefined,
            phone: userData?.phone ?? undefined,
          });

          const html = createEmailTemplate({
            content: personalizedContent,
            settings,
          });

          const success = await sendEmail({
            to: recipient.email,
            subject: personalizedSubject,
            html,
            text: personalizedContent.replace(/<[^>]*>/g, ""),
            attachments: campaign.attachments as { filename: string; content: string }[] | undefined,
            type: "bulk",
          });

          if (success) {
            sentCount++;
            await db.emailCampaignRecipient.update({
              where: { id: recipient.id },
              data: { status: "sent", sentAt: new Date() },
            });
          } else {
            failedCount++;
            await db.emailCampaignRecipient.update({
              where: { id: recipient.id },
              data: { status: "failed", errorMessage: "فشل الإرسال" },
            });
          }
        } catch (error) {
          failedCount++;
          await db.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "failed",
              errorMessage: error instanceof Error ? error.message : "خطأ غير معروف",
            },
          });
        }
      }

      // Update campaign status
      await db.emailCampaign.update({
        where: { id: campaign.id },
        data: {
          status: failedCount === campaign.recipients.length ? "failed" : "completed",
          sentCount,
          failedCount,
          completedAt: new Date(),
        },
      });

      return { sentCount, failedCount, totalCount: campaign.recipients.length };
    }),

  /**
   * Get campaigns list with pagination
   */
  getCampaigns: adminProcedure
    .input(
      z.object({
        status: z.enum(["all", "draft", "sending", "completed", "failed"]).default("all"),
        search: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      if (input.status !== "all") {
        where.status = input.status;
      }

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { subject: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const campaigns = await db.emailCampaign.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          subject: true,
          status: true,
          totalRecipients: true,
          sentCount: true,
          failedCount: true,
          createdAt: true,
          sentAt: true,
          completedAt: true,
          createdBy: {
            select: { name: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (campaigns.length > input.limit) {
        const nextItem = campaigns.pop();
        nextCursor = nextItem?.id;
      }

      return { campaigns, nextCursor };
    }),

  /**
   * Get single campaign with full details
   */
  getCampaign: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.emailCampaign.findUnique({
        where: { id: input.id },
        include: {
          createdBy: {
            select: { name: true, email: true },
          },
          _count: {
            select: { recipients: true },
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحملة غير موجودة",
        });
      }

      return campaign;
    }),

  /**
   * Get campaign recipients with pagination
   */
  getCampaignRecipients: adminProcedure
    .input(
      z.object({
        campaignId: z.string(),
        status: z.enum(["all", "pending", "sent", "failed"]).default("all"),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        campaignId: input.campaignId,
      };

      if (input.status !== "all") {
        where.status = input.status;
      }

      const recipients = await db.emailCampaignRecipient.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { sentAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          errorMessage: true,
          sentAt: true,
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (recipients.length > input.limit) {
        const nextItem = recipients.pop();
        nextCursor = nextItem?.id;
      }

      return { recipients, nextCursor };
    }),

  /**
   * Resend to failed recipients
   */
  resendToFailed: adminProcedure
    .input(z.object({ campaignId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Reset failed recipients to pending
      await db.emailCampaignRecipient.updateMany({
        where: {
          campaignId: input.campaignId,
          status: "failed",
        },
        data: {
          status: "pending",
          errorMessage: null,
        },
      });

      // Reset campaign status if needed
      await db.emailCampaign.update({
        where: { id: input.campaignId },
        data: { status: "draft" },
      });

      // Trigger send (reuse sendCampaign logic indirectly)
      return { success: true };
    }),

  /**
   * Delete a campaign
   */
  deleteCampaign: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.emailCampaign.findUnique({
        where: { id: input.id },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحملة غير موجودة",
        });
      }

      if (campaign.status === "sending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن حذف حملة قيد الإرسال",
        });
      }

      await ctx.db.emailCampaign.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Get campaign stats for dashboard
   */
  getCampaignStats: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const [total, completed, failed, thisMonth] = await Promise.all([
      db.emailCampaign.count(),
      db.emailCampaign.count({ where: { status: "completed" } }),
      db.emailCampaign.count({ where: { status: "failed" } }),
      db.emailCampaign.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return { total, completed, failed, thisMonth };
  }),

  /**
   * Get sessions for dropdown
   */
  getSessions: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.session.findMany({
      orderBy: { date: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        sessionNumber: true,
        date: true,
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });
  }),

  /**
   * Get labels for dropdown
   */
  getLabels: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.userLabel.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });
  }),
});
