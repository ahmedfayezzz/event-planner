"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { Footer } from "./footer";

// Routes that have their own layouts and don't need the main navbar/footer
const EXCLUDED_PATHS = ["/admin", "/valet"];

function isExcludedPath(pathname: string | null): boolean {
  return EXCLUDED_PATHS.some((path) => pathname?.startsWith(path));
}

export function ConditionalNavbar() {
  const pathname = usePathname();
  if (isExcludedPath(pathname)) return null;
  return <Navbar />;
}

export function ConditionalFooter() {
  const pathname = usePathname();
  if (isExcludedPath(pathname)) return null;
  return <Footer />;
}

export function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExcluded = isExcludedPath(pathname);

  // Admin/valet routes handle their own layout, no padding needed
  // Non-admin routes need pt-20 for navbar spacing
  return (
    <main className={`flex-1 ${isExcluded ? "" : "pt-20"}`}>{children}</main>
  );
}
