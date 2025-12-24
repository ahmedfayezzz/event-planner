import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";
import { generateUsername, formatPhoneNumber } from "@/lib/validation";
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
        companyName: z.string().min(1, "اسم الشركة مطلوب"),
        position: z.string().min(1, "المنصب مطلوب"),
        activityType: z.string().optional(),
        gender: z.enum(["male", "female"]).optional(),
        goal: z.string().optional(),
        // Sponsorship fields (new)
        wantsToSponsor: z.boolean().default(false),
        sponsorshipTypes: z.array(z.string()).default([]),
        sponsorshipOtherText: z.string().optional(),
        sponsorType: z.enum(["person", "company"]).optional(),
        sponsorCompanyName: z.string().optional(),
        // Backward compatibility (deprecated)
        wantsToHost: z.boolean().default(false),
        hostingTypes: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Format phone
      const formattedPhone = formatPhoneNumber(input.phone);

      const email = input.email.toLowerCase();

      // Check if phone OR email matches an existing user
      const existingUser = await db.user.findFirst({
        where: {
          OR: [{ phone: formattedPhone }, { email }],
        },
      });

      let user;
      let isUpgrade = false;

      if (existingUser) {
        // If it's a GUEST user, upgrade to USER
        if (existingUser.role === "GUEST") {
          const passwordHash = await bcrypt.hash(input.password, 10);

          user = await db.user.update({
            where: { id: existingUser.id },
            data: {
              role: "USER",
              passwordHash,
              // Override profile data with form data
              name: input.name,
              email,
              phone: formattedPhone,
              instagram: input.instagram || null,
              snapchat: input.snapchat || null,
              twitter: input.twitter || null,
              companyName: input.companyName || null,
              position: input.position || null,
              activityType: input.activityType || null,
              gender: input.gender || null,
              goal: input.goal || null,
              // Backward compat - keep synced with sponsorship
              wantsToHost: input.wantsToSponsor || input.wantsToHost,
              hostingTypes: input.wantsToSponsor
                ? input.sponsorshipTypes
                : input.wantsToHost
                ? input.hostingTypes
                : [],
            },
          });
          isUpgrade = true;

          // Create Sponsor record if user wants to sponsor
          if (input.wantsToSponsor) {
            // Check if user already has a sponsor record
            const existingSponsor = await db.sponsor.findFirst({
              where: { userId: user.id },
            });

            // Determine sponsor name: use company name if type is company, otherwise user name
            const sponsorName =
              input.sponsorType === "company" && input.sponsorCompanyName
                ? input.sponsorCompanyName
                : input.name;

            if (existingSponsor) {
              // Update existing sponsor
              await db.sponsor.update({
                where: { id: existingSponsor.id },
                data: {
                  name: sponsorName,
                  email,
                  phone: formattedPhone,
                  type: input.sponsorType || "person",
                  sponsorshipTypes: input.sponsorshipTypes,
                  sponsorshipOtherText: input.sponsorshipOtherText || null,
                },
              });
            } else {
              // Create new sponsor
              await db.sponsor.create({
                data: {
                  userId: user.id,
                  name: sponsorName,
                  email,
                  phone: formattedPhone,
                  type: input.sponsorType || "person",
                  sponsorshipTypes: input.sponsorshipTypes,
                  sponsorshipOtherText: input.sponsorshipOtherText || null,
                },
              });
            }
          }
        } else {
          // USER, ADMIN, or SUPER_ADMIN - account already exists
          throw new TRPCError({
            code: "CONFLICT",
            message: "الحساب مسجل مسبقاً، يرجى تسجيل الدخول",
          });
        }
      } else {
        // No existing user - create new USER account
        const username = await generateUsername(input.name);
        const passwordHash = await bcrypt.hash(input.password, 10);

        user = await db.user.create({
          data: {
            name: input.name,
            username,
            email,
            phone: formattedPhone,
            passwordHash,
            role: "USER",
            instagram: input.instagram || null,
            snapchat: input.snapchat || null,
            twitter: input.twitter || null,
            companyName: input.companyName || null,
            position: input.position || null,
            activityType: input.activityType || null,
            gender: input.gender || null,
            goal: input.goal || null,
            // Backward compat - keep synced with sponsorship
            wantsToHost: input.wantsToSponsor || input.wantsToHost,
            hostingTypes: input.wantsToSponsor
              ? input.sponsorshipTypes
              : input.wantsToHost
              ? input.hostingTypes
              : [],
          },
        });

        // Create Sponsor record if user wants to sponsor
        if (input.wantsToSponsor) {
          // Determine sponsor name: use company name if type is company, otherwise user name
          const sponsorName =
            input.sponsorType === "company" && input.sponsorCompanyName
              ? input.sponsorCompanyName
              : input.name;

          await db.sponsor.create({
            data: {
              userId: user.id,
              name: sponsorName,
              email,
              phone: formattedPhone,
              type: input.sponsorType || "person",
              sponsorshipTypes: input.sponsorshipTypes,
              sponsorshipOtherText: input.sponsorshipOtherText || null,
            },
          });
        }
      }

      // Send welcome email
      await sendWelcomeEmail(user.email, user.name);

      return {
        success: true,
        userId: user.id,
        username: user.username,
        upgraded: isUpgrade,
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
