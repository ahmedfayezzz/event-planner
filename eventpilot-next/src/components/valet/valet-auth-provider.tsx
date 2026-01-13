"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Car, LogOut, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ValetEmployee {
  id: string;
  name: string;
  username: string;
}

interface ValetAuthContextType {
  employee: ValetEmployee | null;
  isAuthenticated: boolean;
  login: (emp: ValetEmployee, token: string) => void;
  logout: () => void;
}

const ValetAuthContext = createContext<ValetAuthContextType | null>(null);

export function useValetAuth() {
  const context = useContext(ValetAuthContext);
  if (!context) {
    throw new Error("useValetAuth must be used within a ValetAuthProvider");
  }
  return context;
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

export function ValetAuthProvider({ children }: { children: React.ReactNode }) {
  const [employee, setEmployee] = useState<ValetEmployee | null>(null);
  const [mounted, setMounted] = useState(false);
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

    setMounted(true);
  }, []);

  useEffect(() => {
    // Redirect logic - only after mounted
    if (!mounted) return;

    const isLoginPage = pathname === "/valet/login";
    const isPublicTrackingPage = pathname.startsWith("/valet/track/");
    const hasToken = localStorage.getItem("valet-token");

    // Skip auth for public tracking pages
    if (isPublicTrackingPage) return;

    if (!hasToken && !isLoginPage) {
      router.push("/valet/login");
    } else if (hasToken && isLoginPage) {
      router.push("/valet");
    }
  }, [mounted, pathname, router]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("valet-token");
    localStorage.removeItem("valet-employee");
    setEmployee(null);
    router.push("/valet/login");
  }, [router]);

  const handleLogin = useCallback((emp: ValetEmployee, token: string) => {
    localStorage.setItem("valet-token", token);
    localStorage.setItem("valet-employee", JSON.stringify(emp));
    setEmployee(emp);
    router.push("/valet");
  }, [router]);

  // Expose login function on window for backward compatibility with login page
  useEffect(() => {
    if (mounted) {
      (window as unknown as { valetLoginSuccess?: typeof handleLogin }).valetLoginSuccess = handleLogin;
      return () => {
        delete (window as unknown as { valetLoginSuccess?: typeof handleLogin }).valetLoginSuccess;
      };
    }
  }, [mounted, handleLogin]);

  const isLoginPage = pathname === "/valet/login";
  const isHomePage = pathname === "/valet";
  const isPublicTrackingPage = pathname.startsWith("/valet/track/");
  const showHomeButton = !isLoginPage && !isHomePage && !isPublicTrackingPage;
  const showHeader = !isLoginPage && !isPublicTrackingPage;

  // Show loading state only after mount to avoid hydration mismatch
  // Before mount, render children directly (server render)
  if (!mounted) {
    return (
      <>
        <main className="container mx-auto px-4 py-4 min-h-[calc(100vh-56px)]">
          <div className="min-h-screen flex items-center justify-center">
            <Car className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        </main>
      </>
    );
  }

  return (
    <ValetAuthContext.Provider
      value={{
        employee,
        isAuthenticated: !!employee,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
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
        {children}
      </main>
    </ValetAuthContext.Provider>
  );
}
