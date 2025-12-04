"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    instagram: "",
    snapchat: "",
    twitter: "",
    companyName: "",
    position: "",
    activityType: "",
    gender: "" as "male" | "female" | "",
    goal: "",
  });

  const registerMutation = api.auth.register.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول");
      router.push("/user/login");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الحساب");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("كلمة المرور وتأكيدها غير متطابقتين");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setIsLoading(true);

    try {
      await registerMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        instagram: formData.instagram || undefined,
        snapchat: formData.snapchat || undefined,
        twitter: formData.twitter || undefined,
        companyName: formData.companyName || undefined,
        position: formData.position || undefined,
        activityType: formData.activityType || undefined,
        gender: formData.gender || undefined,
        goal: formData.goal || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5"></div>
      <div className="w-full max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-primary">إنشاء حساب جديد</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            انضم إلى مجتمع ثلوثية الأعمال
          </p>
        </div>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-md">
          <CardHeader className="text-center pb-2">
            <CardDescription>
              أدخل بياناتك للتسجيل في المنصة
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-primary border-b border-primary/10 pb-2 flex items-center gap-2">
                  <span className="w-2 h-6 bg-secondary rounded-full inline-block"></span>
                  المعلومات الأساسية
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">الجنس</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value as "male" | "female" })}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="bg-white/50 border-primary/20 focus:border-primary">
                        <SelectValue placeholder="اختر الجنس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-4">
                <h3 className="font-semibold text-primary border-b border-primary/10 pb-2 flex items-center gap-2">
                  <span className="w-2 h-6 bg-secondary rounded-full inline-block"></span>
                  كلمة المرور
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-primary border-b border-primary/10 pb-2 flex items-center gap-2">
                  <span className="w-2 h-6 bg-secondary rounded-full inline-block"></span>
                  المعلومات المهنية (اختياري)
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">اسم الشركة</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">المنصب</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="activityType">نوع النشاط</Label>
                    <Input
                      id="activityType"
                      value={formData.activityType}
                      onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h3 className="font-semibold text-primary border-b border-primary/10 pb-2 flex items-center gap-2">
                  <span className="w-2 h-6 bg-secondary rounded-full inline-block"></span>
                  وسائل التواصل (اختياري)
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      placeholder="instagram.com/..."
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="snapchat">Snapchat</Label>
                    <Input
                      id="snapchat"
                      placeholder="snapchat.com/add/..."
                      value={formData.snapchat}
                      onChange={(e) => setFormData({ ...formData, snapchat: e.target.value })}
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter / X</Label>
                    <Input
                      id="twitter"
                      placeholder="x.com/..."
                      value={formData.twitter}
                      onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                      disabled={isLoading}
                      className="bg-white/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Goal */}
              <div className="space-y-2">
                <Label htmlFor="goal">هدفك من الحضور (اختياري)</Label>
                <Textarea
                  id="goal"
                  placeholder="ما الذي تتمنى تحقيقه من خلال حضورك لجلسات ثلوثية الأعمال؟"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  disabled={isLoading}
                  rows={3}
                  className="bg-white/50 border-primary/20 focus:border-primary"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-6">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-all hover:shadow-xl py-6 text-lg" disabled={isLoading}>
                {isLoading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
              </Button>
              <div className="text-center text-sm">
                لديك حساب بالفعل؟{" "}
                <Link href="/user/login" className="font-semibold text-secondary hover:text-secondary/80 hover:underline">
                  تسجيل الدخول
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
