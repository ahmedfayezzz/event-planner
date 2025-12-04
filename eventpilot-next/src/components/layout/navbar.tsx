"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ease-out ${isScrolled
      ? 'pt-4 px-4 bg-transparent'
      : 'pt-0 px-0 border-b border-border/40 bg-background/95 backdrop-blur-sm'
      }`} style={{ willChange: 'padding, background-color' }}>
      <div className={`container mx-auto transition-all duration-200 ease-out ${isScrolled ? 'max-w-7xl' : 'max-w-full px-0'}`}>
        <div className={`flex items-center justify-between px-6 transition-all duration-200 ease-out ${isScrolled
          ? 'h-16 rounded-full border border-white/20 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg shadow-black/5'
          : 'h-20 border-none bg-transparent'
          }`} style={{ willChange: 'height, border-radius, background-color' }}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-primary/90 transition-colors">
              ث
            </div>
            <span className="text-xl font-bold text-primary tracking-tight hidden sm:inline">ثلوثية الأعمال</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/sessions"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:text-primary px-3 py-2 rounded-full hover:bg-primary/5"
            >
              الجلسات
            </Link>
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:text-primary px-3 py-2 rounded-full hover:bg-primary/5"
              >
                لوحة التحكم
              </Link>
            )}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            {status === "loading" ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-primary/10">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(session.user?.name || "U")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{session.user?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/user/dashboard">لوحة التحكم</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user/change-password">تغيير كلمة المرور</Link>
                  </DropdownMenuItem>
                  {session.user?.role === "ADMIN" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">إدارة الموقع</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="rounded-full hover:bg-primary/10" asChild>
                  <Link href="/user/login">تسجيل الدخول</Link>
                </Button>
                <Button size="sm" className="rounded-full shadow-md hover:shadow-lg transition-shadow" asChild>
                  <Link href="/register">إنشاء حساب</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-primary/10">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">فتح القائمة</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="text-right text-primary">القائمة</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-8">
                  {/* User Info if logged in */}
                  {session && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg mb-2">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(session.user?.name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{session.user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.user?.email}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Navigation Links */}
                  <Link
                    href="/sessions"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    الجلسات
                  </Link>

                  {session?.user?.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      لوحة التحكم
                    </Link>
                  )}

                  {/* Auth Section */}
                  {session ? (
                    <>
                      <div className="border-t pt-4 mt-2">
                        <Link
                          href="/user/dashboard"
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          لوحة التحكم
                        </Link>
                        <Link
                          href="/user/change-password"
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          تغيير كلمة المرور
                        </Link>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors text-right"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            signOut({ callbackUrl: "/" });
                          }}
                        >
                          تسجيل الخروج
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3 border-t pt-4 mt-2">
                      <Button
                        className="w-full rounded-full"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/register">إنشاء حساب</Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full rounded-full"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/user/login">تسجيل الدخول</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
