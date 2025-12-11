"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  QrCode,
  Menu,
  LogOut,
  User,
  Home,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  UtensilsCrossed,
  ShieldCheck,
} from "lucide-react";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import {
  hasPermission,
  type PermissionKey,
  type AdminUser,
} from "@/lib/permissions";

type SidebarLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: PermissionKey;
  superAdminOnly?: boolean;
};

const allSidebarLinks: SidebarLink[] = [
  {
    href: "/admin",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    permission: "dashboard",
  },
  {
    href: "/admin/sessions",
    label: "الأحداث",
    icon: Calendar,
    permission: "sessions",
  },
  {
    href: "/admin/users",
    label: "الأعضاء",
    icon: Users,
    permission: "users",
  },
  {
    href: "/admin/admins",
    label: "المديرين",
    icon: ShieldCheck,
    superAdminOnly: true,
  },
  {
    href: "/admin/sponsors",
    label: "الرعاة",
    icon: UtensilsCrossed,
    permission: "hosts",
  },
  {
    href: "/admin/analytics",
    label: "الإحصائيات",
    icon: BarChart3,
    permission: "analytics",
  },
  {
    href: "/admin/checkin",
    label: "تسجيل الحضور",
    icon: QrCode,
    permission: "checkin",
  },
  {
    href: "/admin/settings",
    label: "الإعدادات",
    icon: Settings,
    permission: "settings",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved !== null) {
      setSidebarCollapsed(saved === "true");
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("admin-sidebar-collapsed", String(newState));
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const userRole = session?.user?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  if (status === "unauthenticated" || !isAdmin) {
    redirect("/user/login?callbackUrl=/admin");
  }

  // Cast user to AdminUser type for permission checks
  const adminUser = session?.user as AdminUser | undefined;
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  // Filter sidebar links based on permissions
  const sidebarLinks = allSidebarLinks.filter((link) => {
    // Super admin only links
    if (link.superAdminOnly) {
      return isSuperAdmin;
    }
    // Permission-based links
    if (link.permission) {
      return hasPermission(adminUser, link.permission);
    }
    return true;
  });

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AD";

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen flex flex-col">
        {/* Admin Header */}
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-14 items-center justify-between px-4 lg:px-6">
            {/* Right: Logo */}
            <Link href="/admin" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="ثلوثية الأعمال"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg"
              />
              <span className="font-semibold hidden sm:inline">لوحة التحكم</span>
            </Link>

            {/* Left: Mobile Menu + Profile */}
            <div className="flex items-center gap-2">
              {/* Mobile Burger Menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">فتح القائمة</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-right">القائمة</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 p-4">
                    {sidebarLinks.map((link) => {
                      const isActive =
                        pathname === link.href ||
                        (link.href !== "/admin" &&
                          pathname.startsWith(link.href));

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
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
                </SheetContent>
              </Sheet>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-9 w-9"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium">{session?.user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session?.user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/" className="cursor-pointer">
                      <Home className="me-2 h-4 w-4" />
                      الموقع الرئيسي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user/registrations" className="cursor-pointer">
                      <User className="me-2 h-4 w-4" />
                      لوحة المستخدم
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="me-2 h-4 w-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          {/* Desktop Fixed Sidebar */}
          <aside
            className={cn(
              "hidden lg:flex flex-col fixed top-14 bottom-0 end-0 z-40 border-s bg-card transition-all duration-300",
              sidebarCollapsed ? "w-16" : "w-56"
            )}
          >
            {/* Navigation Links */}
            <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
              {sidebarLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/admin" && pathname.startsWith(link.href));

                const linkContent = (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                  >
                    <link.icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && <span>{link.label}</span>}
                  </Link>
                );

                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={link.href}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="left" sideOffset={10}>
                        {link.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </nav>

            {/* Collapse Toggle Button */}
            <div className="border-t p-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCollapsed}
                    className={cn(
                      "w-full justify-center",
                      !sidebarCollapsed && "justify-start"
                    )}
                  >
                    {sidebarCollapsed ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4 me-2" />
                        <span>طي القائمة</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="left" sideOffset={10}>
                    فتح القائمة
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </aside>

          {/* Main content */}
          <main
            className={cn(
              "flex-1 overflow-auto transition-all duration-300",
              "lg:me-16",
              !sidebarCollapsed && "lg:me-56"
            )}
          >
            <div className="container py-6 max-w-6xl">
              <Breadcrumbs />
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
