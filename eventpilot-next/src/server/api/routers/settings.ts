import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
} from "../trpc";

const SETTINGS_KEY = "global";

export const settingsRouter = createTRPCRouter({
  /**
   * Get global settings (public - for form defaults)
   */
  get: publicProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    let settings = await db.settings.findUnique({
      where: { key: SETTINGS_KEY },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await db.settings.create({
        data: {
          key: SETTINGS_KEY,
          showSocialMediaFields: true,
          showRegistrationPurpose: true,
          showCateringInterest: true,
        },
      });
    }

    return settings;
  }),

  /**
   * Update global settings (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        showSocialMediaFields: z.boolean().optional(),
        showRegistrationPurpose: z.boolean().optional(),
        showCateringInterest: z.boolean().optional(),
        siteName: z.string().optional(),
        contactEmail: z.string().email().optional().nullable(),
        contactPhone: z.string().optional().nullable(),
        // Social media handles
        twitterHandle: z.string().optional().nullable(),
        instagramHandle: z.string().optional().nullable(),
        snapchatHandle: z.string().optional().nullable(),
        linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
        whatsappNumber: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get or create settings
      let settings = await db.settings.findUnique({
        where: { key: SETTINGS_KEY },
      });

      if (!settings) {
        settings = await db.settings.create({
          data: {
            key: SETTINGS_KEY,
            ...input,
          },
        });
      } else {
        settings = await db.settings.update({
          where: { key: SETTINGS_KEY },
          data: input,
        });
      }

      return settings;
    }),
});
