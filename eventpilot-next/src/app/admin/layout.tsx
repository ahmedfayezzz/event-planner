"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  QrCode,
} from "lucide-react";

const sidebarLinks = [
  {
    href: "/admin",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/sessions",
    label: "الجلسات",
    icon: Calendar,
  },
  {
    href: "/admin/users",
    label: "المستخدمين",
    icon: Users,
  },
  {
    href: "/admin/checkin",
    label: "تسجيل الحضور",
    icon: QrCode,
  },
  {
    href: "/admin/settings",
    label: "الإعدادات",
    icon: Settings,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
    redirect("/user/login?callbackUrl=/admin");
  }

  return (
    <div className="flex min-h-[calc(100vh-130px)]">
      {/* Sidebar */}
      <aside className="hidden w-64 border-l bg-card md:block">
        <nav className="flex flex-col gap-1 p-4">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
        <nav className="flex justify-around p-2">
          {sidebarLinks.slice(0, 4).map((link) => {
            const isActive = pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg p-2 text-xs transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
}
