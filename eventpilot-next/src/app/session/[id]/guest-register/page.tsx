"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CountdownTimer } from "@/components/countdown-timer";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";
import { toast } from "sonner";

interface Companion {
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
}

export default function GuestRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") || undefined;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [companions, setCompanions] = useState<Companion[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    instagram: "",
    snapchat: "",
    twitter: "",
    companyName: "",
    position: "",
    activityType: "",
    gender: "" as "male" | "female" | "",
    goal: "",
  });

  const { data: session, isLoading } = api.session.getById.useQuery({ id });

  const registerMutation = api.registration.guestRegister.useMutation({
    onSuccess: (data) => {
      toast.success("تم التسجيل بنجاح!");
      router.push(`/registration/${data.id}/confirmation`);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء التسجيل");
    },
  });

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCompanion = () => {
    if (session && companions.length >= session.maxCompanions) {
      toast.error(`الحد الأقصى للمرافقين هو ${session.maxCompanions}`);
      return;
    }
    setCompanions([...companions, { name: "", company: "", title: "", phone: "", email: "" }]);
  };

  const handleRemoveCompanion = (index: number) => {
    setCompanions(companions.filter((_, i) => i !== index));
  };

  const handleCompanionChange = (index: number, field: keyof Companion, value: string) => {
    const updated = [...companions];
    updated[index] = { ...updated[index], [field]: value };
    setCompanions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("الرجاء إدخال الاسم");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("الرجاء إدخال البريد الإلكتروني");
      return;
    }

    if (!formData.phone.trim()) {
      toast.error("الرجاء إدخال رقم الهاتف");
      return;
    }

    if (createAccount && !formData.password.trim()) {
      toast.error("الرجاء إدخال كلمة المرور");
      return;
    }

    if (createAccount && formData.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    // Validate companions have names
    const validCompanions = companions.filter((c) => c.name.trim());

    setIsSubmitting(true);
    try {
      await registerMutation.mutateAsync({
        sessionId: id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: createAccount ? formData.password : undefined,
        createAccount,
        instagram: formData.instagram || undefined,
        snapchat: formData.snapchat || undefined,
        twitter: formData.twitter || undefined,
        companyName: formData.companyName || undefined,
        position: formData.position || undefined,
        activityType: formData.activityType || undefined,
        gender: formData.gender || undefined,
        goal: formData.goal || undefined,
        inviteToken,
        companions: validCompanions,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">الجلسة غير موجودة</h1>
        <Button asChild>
          <Link href="/sessions">العودة للجلسات</Link>
        </Button>
      </div>
    );
  }

  if (!session.canRegister) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">التسجيل غير متاح</h1>
        <p className="text-muted-foreground mb-6">
          {session.isFull ? "الجلسة مكتملة العدد" : "التسجيل مغلق لهذه الجلسة"}
        </p>
        <Button asChild>
          <Link href={`/session/${id}`}>العودة لتفاصيل الجلسة</Link>
        </Button>
      </div>
    );
  }

  if (session.inviteOnly && !inviteToken) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">جلسة بدعوة فقط</h1>
        <p className="text-muted-foreground mb-6">
          هذه الجلسة تتطلب رابط دعوة للتسجيل
        </p>
        <Button asChild>
          <Link href={`/session/${id}`}>العودة لتفاصيل الجلسة</Link>
        </Button>
      </div>
    );
  }

  const isUpcoming = new Date(session.date) > new Date();

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Session Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{session.title}</CardTitle>
                <CardDescription>التجمع رقم {session.sessionNumber}</CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                مفتوح للتسجيل
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">التاريخ</p>
                <p className="font-medium">{formatArabicDate(new Date(session.date))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الوقت</p>
                <p className="font-medium">{formatArabicTime(new Date(session.date))}</p>
              </div>
              {session.location && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">المكان</p>
                  <p className="font-medium">{session.location}</p>
                </div>
              )}
            </div>

            {isUpcoming && session.showCountdown && (
              <div className="pt-4 border-t">
                <CountdownTimer targetDate={new Date(session.date)} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>التسجيل كزائر</CardTitle>
              <CardDescription>
                أدخل بياناتك للتسجيل في الجلسة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold">المعلومات الأساسية</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="example@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="05XXXXXXXX"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">الجنس</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => handleInputChange("gender", value)}
                    >
                      <SelectTrigger>
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

              <Separator />

              {/* Professional Info */}
              <div className="space-y-4">
                <h3 className="font-semibold">المعلومات المهنية</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">اسم الشركة / المؤسسة</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange("companyName", e.target.value)}
                      placeholder="اسم الشركة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">المنصب / الوظيفة</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleInputChange("position", e.target.value)}
                      placeholder="المنصب الوظيفي"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activityType">نوع النشاط</Label>
                  <Input
                    id="activityType"
                    value={formData.activityType}
                    onChange={(e) => handleInputChange("activityType", e.target.value)}
                    placeholder="مثال: تجارة، تقنية، استشارات"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">ماذا تتمنى من الانضمام؟</Label>
                  <Textarea
                    id="goal"
                    value={formData.goal}
                    onChange={(e) => handleInputChange("goal", e.target.value)}
                    placeholder="أخبرنا عن أهدافك من الانضمام للتجمع"
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Social Media */}
              <div className="space-y-4">
                <h3 className="font-semibold">وسائل التواصل الاجتماعي</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={formData.instagram}
                      onChange={(e) => handleInputChange("instagram", e.target.value)}
                      placeholder="اسم المستخدم"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="snapchat">Snapchat</Label>
                    <Input
                      id="snapchat"
                      value={formData.snapchat}
                      onChange={(e) => handleInputChange("snapchat", e.target.value)}
                      placeholder="اسم المستخدم"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">X (Twitter)</Label>
                    <Input
                      id="twitter"
                      value={formData.twitter}
                      onChange={(e) => handleInputChange("twitter", e.target.value)}
                      placeholder="اسم المستخدم"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Companions */}
              {session.maxCompanions > 0 && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">المرافقين</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCompanion}
                        disabled={companions.length >= session.maxCompanions}
                      >
                        + إضافة مرافق
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      يمكنك إضافة حتى {session.maxCompanions} مرافقين
                    </p>

                    {companions.map((companion, index) => (
                      <Card key={index} className="bg-muted/50">
                        <CardContent className="pt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">مرافق {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCompanion(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              حذف
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>الاسم *</Label>
                              <Input
                                value={companion.name}
                                onChange={(e) => handleCompanionChange(index, "name", e.target.value)}
                                placeholder="اسم المرافق"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>الشركة</Label>
                              <Input
                                value={companion.company}
                                onChange={(e) => handleCompanionChange(index, "company", e.target.value)}
                                placeholder="اسم الشركة"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>المنصب</Label>
                              <Input
                                value={companion.title}
                                onChange={(e) => handleCompanionChange(index, "title", e.target.value)}
                                placeholder="المنصب الوظيفي"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>رقم الهاتف</Label>
                              <Input
                                value={companion.phone}
                                onChange={(e) => handleCompanionChange(index, "phone", e.target.value)}
                                placeholder="05XXXXXXXX"
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>البريد الإلكتروني</Label>
                              <Input
                                type="email"
                                value={companion.email}
                                onChange={(e) => handleCompanionChange(index, "email", e.target.value)}
                                placeholder="example@email.com"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Separator />
                </>
              )}

              {/* Create Account Option */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <Checkbox
                    id="createAccount"
                    checked={createAccount}
                    onCheckedChange={(checked) => setCreateAccount(checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="createAccount" className="cursor-pointer">
                      إنشاء حساب جديد
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      أنشئ حساباً لتتمكن من تتبع تسجيلاتك والحصول على ميزات إضافية
                    </p>
                  </div>
                </div>

                {createAccount && (
                  <div className="space-y-2 pr-7">
                    <Label htmlFor="password">كلمة المرور *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="كلمة المرور (6 أحرف على الأقل)"
                      required={createAccount}
                      minLength={6}
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>

              {session.requiresApproval && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm text-amber-800">
                    * هذه الجلسة تتطلب موافقة على التسجيل. سيتم إرسال بريد إلكتروني عند الموافقة.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "جارٍ التسجيل..." : "تأكيد التسجيل"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                لديك حساب؟{" "}
                <Link
                  href={`/user/login?callbackUrl=/session/${id}`}
                  className="text-primary hover:underline"
                >
                  سجل دخول
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
