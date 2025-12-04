"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/user/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else {
        toast.success("تم تسجيل الدخول بنجاح");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full bg-gradient-to-br from-white to-primary/5 backdrop-blur-xl border border-primary/10 shadow-2xl hover:border-primary/20 transition-all rounded-xl md:rounded-2xl">
      <CardHeader className="space-y-1 pb-2 md:pb-4 px-4 md:px-6 pt-5 md:pt-6">
        <CardTitle className="text-xl md:text-2xl font-bold text-center text-primary">تسجيل الدخول</CardTitle>
        <CardDescription className="text-center text-xs md:text-sm">
          أدخل بريدك الإلكتروني وكلمة المرور
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="email" className="text-sm">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
              className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
            />
          </div>
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm">كلمة المرور</Label>
              <Link
                href="/user/forgot-password"
                className="text-xs md:text-sm text-primary hover:text-primary/80 hover:underline font-medium"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
              className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 md:gap-4 pt-2 px-4 md:px-6 pb-5 md:pb-6">
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-all hover:shadow-xl h-10 md:h-11" disabled={isLoading}>
            {isLoading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
          <div className="text-center text-xs md:text-sm text-foreground/70">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="font-semibold text-primary hover:text-primary/80 hover:underline">
              إنشاء حساب جديد
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

function LoginFormSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Skeleton className="h-8 w-32 mx-auto mb-2" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-40 mx-auto" />
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.08]"></div>
      {/* Decorative glass orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-primary">
            مرحباً بك مجدداً
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            سجل دخولك للمتابعة إلى لوحة التحكم
          </p>
        </div>

        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
