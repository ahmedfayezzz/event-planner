"use client";

import { Inter } from "next/font/google";
import { TRPCReactProvider } from "@/components/providers/trpc-provider";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Car, LogOut, Users, ClipboardList } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

interface ValetEmployee {
  id: string;
  name: string;
  username: string;
}

function ValetNavbar({
  employee,
  onLogout,
}: {
  employee: ValetEmployee | null;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  if (!employee) return null;

  const navItems = [
    { href: "/valet/dashboard", label: "لوحة التحكم", icon: Car },
    { href: "/valet/queue", label: "طوابير الاسترجاع", icon: ClipboardList },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg">بوابة الفاليه</span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {employee.name}
            </span>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden items-center gap-1 pb-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default function ValetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [employee, setEmployee] = useState<ValetEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check for stored token and employee info
    const token = localStorage.getItem("valet-token");
    const storedEmployee = localStorage.getItem("valet-employee");

    if (token && storedEmployee) {
      try {
        setEmployee(JSON.parse(storedEmployee));
      } catch {
        localStorage.removeItem("valet-token");
        localStorage.removeItem("valet-employee");
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Redirect logic
    if (!loading) {
      const isLoginPage = pathname === "/valet/login";
      const hasToken = localStorage.getItem("valet-token");

      if (!hasToken && !isLoginPage) {
        router.push("/valet/login");
      } else if (hasToken && isLoginPage) {
        router.push("/valet/dashboard");
      }
    }
  }, [loading, pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("valet-token");
    localStorage.removeItem("valet-employee");
    setEmployee(null);
    router.push("/valet/login");
  };

  // Update employee state when login succeeds (called from login page)
  const handleLoginSuccess = (emp: ValetEmployee, token: string) => {
    localStorage.setItem("valet-token", token);
    localStorage.setItem("valet-employee", JSON.stringify(emp));
    setEmployee(emp);
    router.push("/valet/dashboard");
  };

  if (loading) {
    return (
      <html lang="ar" dir="rtl">
        <body className={inter.className}>
          <div className="min-h-screen flex items-center justify-center">
            <Car className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        </body>
      </html>
    );
  }

  const isLoginPage = pathname === "/valet/login";

  return (
    <html lang="ar" dir="rtl">
      <body className={cn(inter.className, "min-h-screen bg-gray-50")}>
        <TRPCReactProvider>
          {!isLoginPage && (
            <ValetNavbar employee={employee} onLogout={handleLogout} />
          )}
          <main className={isLoginPage ? "" : "container mx-auto px-4 py-6"}>
            {/* Pass handleLoginSuccess to login page */}
            {isLoginPage ? (
              <LoginWrapper onLoginSuccess={handleLoginSuccess}>
                {children}
              </LoginWrapper>
            ) : (
              children
            )}
          </main>
          <Toaster position="top-center" richColors />
        </TRPCReactProvider>
      </body>
    </html>
  );
}

// Wrapper to pass onLoginSuccess to login page
function LoginWrapper({
  children,
  onLoginSuccess,
}: {
  children: React.ReactNode;
  onLoginSuccess: (emp: ValetEmployee, token: string) => void;
}) {
  // Clone children and pass the callback
  // This is a workaround since we can't easily pass props to page components
  // The login page will access this via window
  useEffect(() => {
    (window as unknown as { valetLoginSuccess?: typeof onLoginSuccess }).valetLoginSuccess = onLoginSuccess;
    return () => {
      delete (window as unknown as { valetLoginSuccess?: typeof onLoginSuccess }).valetLoginSuccess;
    };
  }, [onLoginSuccess]);

  return <>{children}</>;
}
