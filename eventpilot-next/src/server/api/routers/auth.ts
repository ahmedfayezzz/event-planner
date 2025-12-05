import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";
import { generateUsername, formatPhoneNumber, validateSaudiPhone } from "@/lib/validation";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";
import { generateInviteToken } from "@/lib/utils";

export const authRouter = createTRPCRouter({
  /**
   * Register a new user account
   */
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
        email: z.string().email("البريد الإلكتروني غير صالح"),
        phone: z.string().min(9, "رقم الهاتف غير صالح"),
        password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
        instagram: z.string().optional(),
        snapchat: z.string().optional(),
        twitter: z.string().optional(),
        companyName: z.string().optional(),
        position: z.string().optional(),
        activityType: z.string().optional(),
        gender: z.enum(["male", "female"]).optional(),
        goal: z.string().optional(),
        wantsToHost: z.boolean().default(false),
        hostingTypes: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Check if email already exists
      const existingEmail = await db.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (existingEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "البريد الإلكتروني مسجل مسبقاً",
        });
      }

      // Format and validate phone
      const formattedPhone = formatPhoneNumber(input.phone);
      if (!validateSaudiPhone(input.phone)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رقم الهاتف غير صالح",
        });
      }

      // Check if phone already exists
      const existingPhone = await db.user.findUnique({
        where: { phone: formattedPhone },
      });
      if (existingPhone) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "رقم الهاتف مسجل مسبقاً",
        });
      }

      // Generate unique username
      const username = await generateUsername(input.name);

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create user
      const user = await db.user.create({
        data: {
          name: input.name,
          username,
          email: input.email.toLowerCase(),
          phone: formattedPhone,
          passwordHash,
          instagram: input.instagram || null,
          snapchat: input.snapchat || null,
          twitter: input.twitter || null,
          companyName: input.companyName || null,
          position: input.position || null,
          activityType: input.activityType || null,
          gender: input.gender || null,
          goal: input.goal || null,
          wantsToHost: input.wantsToHost,
          hostingTypes: input.wantsToHost ? input.hostingTypes : [],
        },
      });

      // Link any previous guest registrations by email or phone
      await db.registration.updateMany({
        where: {
          userId: null,
          OR: [
            { guestEmail: input.email.toLowerCase() },
            { guestPhone: formattedPhone },
          ],
        },
        data: {
          userId: user.id,
        },
      });

      // Send welcome email
      await sendWelcomeEmail(user.email, user.name);

      return {
        success: true,
        userId: user.id,
        username: user.username,
      };
    }),

  /**
   * Request password reset
   */
  forgotPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email("البريد الإلكتروني غير صالح"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const user = await db.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return { success: true };
      }

      // Generate reset token
      const resetToken = generateInviteToken();
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpires,
        },
      });

      // Send reset email
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/user/reset-password/${resetToken}`;

      await sendPasswordResetEmail(user.email, user.name, resetUrl);

      return { success: true };
    }),

  /**
   * Reset password with token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const user = await db.user.findFirst({
        where: {
          resetToken: input.token,
          resetTokenExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية",
        });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Update password and clear reset token
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpires: null,
        },
      });

      return { success: true };
    }),

  /**
   * Change password for logged-in user
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      const user = await db.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المستخدم غير موجود",
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "كلمة المرور الحالية غير صحيحة",
        });
      }

      // Hash and update new password
      const passwordHash = await bcrypt.hash(input.newPassword, 10);

      await db.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      return { success: true };
    }),

  /**
   * Validate reset token (for UI to check before showing form)
   */
  validateResetToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const user = await db.user.findFirst({
        where: {
          resetToken: input.token,
          resetTokenExpires: {
            gt: new Date(),
          },
        },
      });

      return { valid: !!user };
    }),
});
