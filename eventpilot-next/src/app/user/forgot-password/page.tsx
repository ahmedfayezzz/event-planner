"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotPasswordMutation = api.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await forgotPasswordMutation.mutateAsync({ email });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-8 md:py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern-dots opacity-[0.08]"></div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
        <Card className="w-full max-w-md border border-white/50 shadow-2xl bg-white/70 backdrop-blur-xl rounded-xl md:rounded-2xl relative z-10">
          <CardHeader className="text-center px-4 md:px-6 pt-5 md:pt-6 pb-2 md:pb-4">
            <CardTitle className="text-xl md:text-2xl text-primary">تم إرسال الرابط</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3 md:gap-4 px-4 md:px-6 pb-5 md:pb-6">
            <Button variant="outline" asChild className="w-full h-10 md:h-11">
              <Link href="/user/login">العودة لتسجيل الدخول</Link>
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
      <Card className="w-full max-w-md border border-white/50 shadow-2xl bg-white/70 backdrop-blur-xl rounded-xl md:rounded-2xl relative z-10">
        <CardHeader className="text-center px-4 md:px-6 pt-5 md:pt-6 pb-2 md:pb-4">
          <CardTitle className="text-xl md:text-2xl text-primary">نسيت كلمة المرور</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="email" className="text-sm">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={forgotPasswordMutation.isPending}
                className="bg-white/60 backdrop-blur-sm border-white/50 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 md:gap-4 px-4 md:px-6 pb-5 md:pb-6">
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-all hover:shadow-xl h-10 md:h-11"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? "جارٍ الإرسال..." : "إرسال رابط إعادة التعيين"}
            </Button>
            <Link
              href="/user/login"
              className="text-xs md:text-sm text-muted-foreground hover:text-primary"
            >
              العودة لتسجيل الدخول
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
