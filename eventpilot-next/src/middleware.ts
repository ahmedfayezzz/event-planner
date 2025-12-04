import NextAuth from "next-auth";
import { authConfig } from "@/server/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";

  // Public paths that don't require authentication
  const publicPaths = [
    "/",
    "/register",
    "/sessions",
    "/user/login",
    "/user/forgot-password",
  ];

  // Check if current path starts with any public path
  const isPublicPath = publicPaths.some(
    (path) => nextUrl.pathname === path || nextUrl.pathname.startsWith("/session/")
  );

  // Auth pages - redirect to dashboard if already logged in
  const authPaths = ["/user/login", "/user/forgot-password"];
  const isAuthPath = authPaths.some((path) => nextUrl.pathname === path);

  if (isAuthPath && isLoggedIn) {
    return NextResponse.redirect(new URL("/user/dashboard", nextUrl));
  }

  // Admin routes - require ADMIN role
  if (nextUrl.pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(nextUrl.pathname);
      return NextResponse.redirect(
        new URL(`/user/login?callbackUrl=${callbackUrl}`, nextUrl)
      );
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/user/dashboard", nextUrl));
    }
  }

  // User routes (except public ones) - require authentication
  if (nextUrl.pathname.startsWith("/user") && !isPublicPath) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(nextUrl.pathname);
      return NextResponse.redirect(
        new URL(`/user/login?callbackUrl=${callbackUrl}`, nextUrl)
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
