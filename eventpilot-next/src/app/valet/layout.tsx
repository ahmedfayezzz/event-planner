"use client";

import { Inter } from "next/font/google";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Car, LogOut, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

interface ValetEmployee {
  id: string;
  name: string;
  username: string;
}

function ValetHeader({
  employee,
  onLogout,
  showHomeButton,
}: {
  employee: ValetEmployee | null;
  onLogout: () => void;
  showHomeButton: boolean;
}) {
  if (!employee) return null;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-md safe-area-inset">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {showHomeButton && (
              <Link href="/valet">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Car className="h-4 w-4 text-primary" />
              </div>
              <span className="font-bold text-sm">بوابة الفاليه</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden xs:block">
              {employee.name}
            </span>
            <Button variant="ghost" size="icon" onClick={onLogout} className="h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
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
      const isPublicTrackingPage = pathname.startsWith("/valet/track/");
      const hasToken = localStorage.getItem("valet-token");

      // Skip auth for public tracking pages
      if (isPublicTrackingPage) {
        return;
      }

      if (!hasToken && !isLoginPage) {
        router.push("/valet/login");
      } else if (hasToken && isLoginPage) {
        router.push("/valet");
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
    router.push("/valet");
  };

  if (loading) {
    return (
      <html lang="ar" dir="rtl">
        <body className={inter.className}>
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Car className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        </body>
      </html>
    );
  }

  const isLoginPage = pathname === "/valet/login";
  const isHomePage = pathname === "/valet";
  const isPublicTrackingPage = pathname.startsWith("/valet/track/");
  const showHomeButton = !isLoginPage && !isHomePage && !isPublicTrackingPage;
  const showHeader = !isLoginPage && !isPublicTrackingPage;

  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={cn(inter.className, "min-h-screen bg-gray-50")}>
        <TRPCProvider>
          {showHeader && (
            <ValetHeader
              employee={employee}
              onLogout={handleLogout}
              showHomeButton={showHomeButton}
            />
          )}
          <main className={cn(
            (isLoginPage || isPublicTrackingPage) ? "" : "container mx-auto px-4 py-4",
            "min-h-[calc(100vh-56px)]"
          )}>
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
        </TRPCProvider>
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
