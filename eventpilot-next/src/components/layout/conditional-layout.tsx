"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { Footer } from "./footer";

export function ConditionalNavbar() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <Navbar />;
}

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <Footer />;
}

export function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  // Admin routes handle their own layout, no padding needed
  // Non-admin routes need pt-20 for navbar spacing
  return (
    <main className={`flex-1 ${isAdmin ? "" : "pt-20"}`}>{children}</main>
  );
}
