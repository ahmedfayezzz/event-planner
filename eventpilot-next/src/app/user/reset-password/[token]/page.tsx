"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: validation, isLoading } = api.auth.validateResetToken.useQuery({ token });

  const resetPasswordMutation = api.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور بنجاح");
      router.push("/user/login");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("كلمة المرور وتأكيدها غير متطابقتين");
      return;
    }

    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    await resetPasswordMutation.mutateAsync({ token, password });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-8 md:py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern-dots opacity-[0.08]"></div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
        <Card className="w-full max-w-md bg-gradient-to-br from-white to-primary/5 backdrop-blur-xl border border-primary/10 shadow-2xl hover:border-primary/20 transition-all rounded-xl md:rounded-2xl relative z-10">
          <CardHeader className="text-center px-4 md:px-6 pt-5 md:pt-6 pb-2 md:pb-4">
            <Skeleton className="h-6 md:h-8 w-48 mx-auto" />
            <Skeleton className="h-3 md:h-4 w-64 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
            <Skeleton className="h-10 md:h-11 w-full" />
            <Skeleton className="h-10 md:h-11 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-8 md:py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern-dots opacity-[0.08]"></div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
        <Card className="w-full max-w-md bg-gradient-to-br from-white to-primary/5 backdrop-blur-xl border border-primary/10 shadow-2xl hover:border-primary/20 transition-all rounded-xl md:rounded-2xl relative z-10">
          <CardHeader className="text-center px-4 md:px-6 pt-5 md:pt-6 pb-2 md:pb-4">
            <CardTitle className="text-xl md:text-2xl text-primary">رابط غير صالح</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3 md:gap-4 px-4 md:px-6 pb-5 md:pb-6">
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-all hover:shadow-xl h-10 md:h-11">
              <Link href="/user/forgot-password">طلب رابط جديد</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-8 md:py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.08]"></div>
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
      <Card className="w-full max-w-md bg-gradient-to-br from-white to-primary/5 backdrop-blur-xl border border-primary/10 shadow-2xl hover:border-primary/20 transition-all rounded-xl md:rounded-2xl relative z-10">
        <CardHeader className="text-center px-4 md:px-6 pt-5 md:pt-6 pb-2 md:pb-4">
          <CardTitle className="text-xl md:text-2xl text-primary">إعادة تعيين كلمة المرور</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            أدخل كلمة المرور الجديدة
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="password" className="text-sm">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={resetPasswordMutation.isPending}
                  dir="ltr"
                  className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={resetPasswordMutation.isPending}
                  dir="ltr"
                  className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2 px-4 md:px-6 pb-5 md:pb-6">
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-all hover:shadow-xl h-10 md:h-11"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
