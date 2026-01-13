import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          // Include admin permissions
          canAccessDashboard: user.canAccessDashboard,
          canAccessSessions: user.canAccessSessions,
          canAccessUsers: user.canAccessUsers,
          canAccessHosts: user.canAccessHosts,
          canAccessAnalytics: user.canAccessAnalytics,
          canAccessCheckin: user.canAccessCheckin,
          canAccessSettings: user.canAccessSettings,
          canAccessSuggestions: user.canAccessSuggestions,
          canAccessEmailCampaigns: user.canAccessEmailCampaigns,
          canAccessValet: user.canAccessValet,
        };
      },
    }),
  ],
});
