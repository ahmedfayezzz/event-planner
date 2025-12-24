import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "GUEST" | "ADMIN" | "SUPER_ADMIN";
      avatarUrl?: string | null;
      // Admin permissions
      canAccessDashboard: boolean;
      canAccessSessions: boolean;
      canAccessUsers: boolean;
      canAccessHosts: boolean;
      canAccessAnalytics: boolean;
      canAccessCheckin: boolean;
      canAccessSettings: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: "USER" | "GUEST" | "ADMIN" | "SUPER_ADMIN";
    avatarUrl?: string | null;
    canAccessDashboard: boolean;
    canAccessSessions: boolean;
    canAccessUsers: boolean;
    canAccessHosts: boolean;
    canAccessAnalytics: boolean;
    canAccessCheckin: boolean;
    canAccessSettings: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "GUEST" | "ADMIN" | "SUPER_ADMIN";
    avatarUrl?: string | null;
    canAccessDashboard: boolean;
    canAccessSessions: boolean;
    canAccessUsers: boolean;
    canAccessHosts: boolean;
    canAccessAnalytics: boolean;
    canAccessCheckin: boolean;
    canAccessSettings: boolean;
  }
}

// Extend AdapterUser to include role (fixes type mismatch with @auth/prisma-adapter)
declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: "USER" | "GUEST" | "ADMIN" | "SUPER_ADMIN";
    avatarUrl?: string | null;
    canAccessDashboard: boolean;
    canAccessSessions: boolean;
    canAccessUsers: boolean;
    canAccessHosts: boolean;
    canAccessAnalytics: boolean;
    canAccessCheckin: boolean;
    canAccessSettings: boolean;
  }
}
