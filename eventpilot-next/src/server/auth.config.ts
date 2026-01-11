import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    providers: [],
    trustHost: true,
    pages: {
        signIn: "/user/login",
    },
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, user, trigger, session: sessionUpdate }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.avatarUrl = user.avatarUrl;
                // Include admin permissions
                token.canAccessDashboard = user.canAccessDashboard;
                token.canAccessSessions = user.canAccessSessions;
                token.canAccessUsers = user.canAccessUsers;
                token.canAccessHosts = user.canAccessHosts;
                token.canAccessAnalytics = user.canAccessAnalytics;
                token.canAccessCheckin = user.canAccessCheckin;
                token.canAccessSettings = user.canAccessSettings;
                token.canAccessSuggestions = user.canAccessSuggestions;
                token.canAccessEmailCampaigns = user.canAccessEmailCampaigns;
                token.canAccessValet = user.canAccessValet;
            }

            // Handle session update (e.g., after avatar, profile, or permission change)
            if (trigger === "update" && sessionUpdate) {
                if (sessionUpdate.avatarUrl !== undefined) {
                    token.avatarUrl = sessionUpdate.avatarUrl;
                }
                if (sessionUpdate.name !== undefined) {
                    token.name = sessionUpdate.name;
                }
                // Handle permission updates
                if (sessionUpdate.canAccessDashboard !== undefined) {
                    token.canAccessDashboard = sessionUpdate.canAccessDashboard;
                }
                if (sessionUpdate.canAccessSessions !== undefined) {
                    token.canAccessSessions = sessionUpdate.canAccessSessions;
                }
                if (sessionUpdate.canAccessUsers !== undefined) {
                    token.canAccessUsers = sessionUpdate.canAccessUsers;
                }
                if (sessionUpdate.canAccessHosts !== undefined) {
                    token.canAccessHosts = sessionUpdate.canAccessHosts;
                }
                if (sessionUpdate.canAccessAnalytics !== undefined) {
                    token.canAccessAnalytics = sessionUpdate.canAccessAnalytics;
                }
                if (sessionUpdate.canAccessCheckin !== undefined) {
                    token.canAccessCheckin = sessionUpdate.canAccessCheckin;
                }
                if (sessionUpdate.canAccessSettings !== undefined) {
                    token.canAccessSettings = sessionUpdate.canAccessSettings;
                }
                if (sessionUpdate.canAccessSuggestions !== undefined) {
                    token.canAccessSuggestions = sessionUpdate.canAccessSuggestions;
                }
                if (sessionUpdate.canAccessEmailCampaigns !== undefined) {
                    token.canAccessEmailCampaigns = sessionUpdate.canAccessEmailCampaigns;
                }
                if (sessionUpdate.canAccessValet !== undefined) {
                    token.canAccessValet = sessionUpdate.canAccessValet;
                }
                if (sessionUpdate.role !== undefined) {
                    token.role = sessionUpdate.role;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "USER" | "ADMIN" | "SUPER_ADMIN";
                session.user.avatarUrl = token.avatarUrl as string | null | undefined;
                // Include admin permissions
                session.user.canAccessDashboard = token.canAccessDashboard as boolean;
                session.user.canAccessSessions = token.canAccessSessions as boolean;
                session.user.canAccessUsers = token.canAccessUsers as boolean;
                session.user.canAccessHosts = token.canAccessHosts as boolean;
                session.user.canAccessAnalytics = token.canAccessAnalytics as boolean;
                session.user.canAccessCheckin = token.canAccessCheckin as boolean;
                session.user.canAccessSettings = token.canAccessSettings as boolean;
                session.user.canAccessSuggestions = token.canAccessSuggestions as boolean;
                session.user.canAccessEmailCampaigns = token.canAccessEmailCampaigns as boolean;
                session.user.canAccessValet = token.canAccessValet as boolean;
            }
            return session;
        },
    },
} satisfies NextAuthConfig;
