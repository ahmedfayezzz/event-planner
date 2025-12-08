import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    providers: [],
    trustHost: true,
    pages: {
        signIn: "/user/login",
    },
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                // Include admin permissions
                token.canAccessDashboard = user.canAccessDashboard;
                token.canAccessSessions = user.canAccessSessions;
                token.canAccessUsers = user.canAccessUsers;
                token.canAccessHosts = user.canAccessHosts;
                token.canAccessAnalytics = user.canAccessAnalytics;
                token.canAccessCheckin = user.canAccessCheckin;
                token.canAccessSettings = user.canAccessSettings;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "USER" | "ADMIN" | "SUPER_ADMIN";
                // Include admin permissions
                session.user.canAccessDashboard = token.canAccessDashboard as boolean;
                session.user.canAccessSessions = token.canAccessSessions as boolean;
                session.user.canAccessUsers = token.canAccessUsers as boolean;
                session.user.canAccessHosts = token.canAccessHosts as boolean;
                session.user.canAccessAnalytics = token.canAccessAnalytics as boolean;
                session.user.canAccessCheckin = token.canAccessCheckin as boolean;
                session.user.canAccessSettings = token.canAccessSettings as boolean;
            }
            return session;
        },
    },
} satisfies NextAuthConfig;
