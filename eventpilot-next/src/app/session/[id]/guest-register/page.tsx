"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownTimer } from "@/components/countdown-timer";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";
import {
  SponsorshipSection,
  type SponsorshipData,
} from "@/components/registration/sponsorship-section";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  FormSectionHeader,
  PasswordField,
  CompanionSection,
  RegistrationPageLayout,
  type Companion,
} from "@/components/forms";

const inputClassName =
  "bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none";

export default function GuestRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    wantsToSponsor: false,
    sponsorshipTypes: [] as string[],
    sponsorshipOtherText: "",
    sponsorType: "" as "person" | "company" | "",
    sponsorCompanyName: "",
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
    setCompanions([
      ...companions,
      { name: "", company: "", title: "", phone: "", email: "" },
    ]);
  };

  const handleRemoveCompanion = (index: number) => {
    setCompanions(companions.filter((_, i) => i !== index));
  };

  const handleCompanionChange = (
    index: number,
    field: keyof Companion,
    value: string
  ) => {
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

    // Validate companions have required fields (name and phone)
    const validCompanions = companions.filter(
      (c) => c.name.trim() && c.phone.trim().length >= 9
    );

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
        wantsToSponsor: formData.wantsToSponsor,
        sponsorshipTypes: formData.sponsorshipTypes,
        sponsorshipOtherText: formData.sponsorshipOtherText || undefined,
        sponsorType: formData.sponsorType || undefined,
        sponsorCompanyName: formData.sponsorCompanyName || undefined,
        inviteToken,
        companions: validCompanions,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <RegistrationPageLayout>
        <div className="container py-8 md:py-12 px-4">
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </RegistrationPageLayout>
    );
  }

  if (!session) {
    return (
      <RegistrationPageLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4 text-primary">
            الحدث غير موجود
          </h1>
          <Button asChild>
            <Link href="/sessions">العودة للأحداث</Link>
          </Button>
        </div>
      </RegistrationPageLayout>
    );
  }

  if (!session.canRegister) {
    return (
      <RegistrationPageLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4 text-primary">
            التسجيل غير متاح
          </h1>
          <p className="text-muted-foreground mb-6">
            {session.isFull ? "الحدث مكتمل العدد" : "التسجيل مغلق لهذا الحدث"}
          </p>
          <Button asChild>
            <Link href={`/session/${id}`}>العودة لتفاصيل الحدث</Link>
          </Button>
        </div>
      </RegistrationPageLayout>
    );
  }

  if (session.inviteOnly && !inviteToken) {
    return (
      <RegistrationPageLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4 text-primary">
            حدث بدعوة فقط
          </h1>
          <p className="text-muted-foreground mb-6">
            هذا الحدث يتطلب رابط دعوة للتسجيل
          </p>
          <Button asChild>
            <Link href={`/session/${id}`}>العودة لتفاصيل الحدث</Link>
          </Button>
        </div>
      </RegistrationPageLayout>
    );
  }

  const isUpcoming = new Date(session.date) > new Date();

  return (
    <RegistrationPageLayout>
      <div className="container py-8 md:py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Back Link */}
          <Link
            href={`/session/${id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة لتفاصيل الحدث
          </Link>

          {/* Page Header */}
          <div className="text-center mb-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
              التسجيل كزائر
            </h2>
            <p className="mt-2 text-xs md:text-sm text-muted-foreground">
              أدخل بياناتك للتسجيل في الحدث
            </p>
          </div>

          {/* Session Info Card */}
          <Card className="bg-gradient-to-br from-white to-primary/3 backdrop-blur-xl border border-primary/10 shadow-lg rounded-xl md:rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg md:text-xl">
                    {session.title}
                  </CardTitle>
                  <CardDescription>
                    التجمع رقم {session.sessionNumber}
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-0">
                  مفتوح للتسجيل
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p className="font-medium">
                    {formatArabicDate(new Date(session.date))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الوقت</p>
                  <p className="font-medium">
                    {formatArabicTime(new Date(session.date))}
                  </p>
                </div>
                {session.location && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">المكان</p>
                    {session.locationUrl ? (
                      <a
                        href={session.locationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {session.location}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="font-medium">{session.location}</p>
                    )}
                  </div>
                )}
              </div>

              {isUpcoming && session.showCountdown && (
                <div className="pt-4 border-t border-primary/10">
                  <CountdownTimer targetDate={new Date(session.date)} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Registration Form */}
          <form onSubmit={handleSubmit}>
            <Card className="bg-gradient-to-br from-white to-primary/3 backdrop-blur-xl border border-primary/10 shadow-2xl rounded-xl md:rounded-2xl">
              <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6 py-5 md:py-6">
                {/* Basic Info */}
                <div className="space-y-3 md:space-y-4">
                  <FormSectionHeader title="المعلومات الأساسية" />

                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="name" className="text-sm">
                        الاسم الكامل *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        placeholder="أدخل اسمك الكامل"
                        required
                        disabled={isSubmitting}
                        className={inputClassName}
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="email" className="text-sm">
                        البريد الإلكتروني *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        placeholder="example@email.com"
                        required
                        disabled={isSubmitting}
                        dir="ltr"
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="phone" className="text-sm">
                        رقم الهاتف *
                      </Label>
                      <PhoneInput
                        id="phone"
                        international
                        defaultCountry="SA"
                        value={formData.phone}
                        onChange={(value) =>
                          handleInputChange("phone", value || "")
                        }
                        disabled={isSubmitting}
                        className="phone-input-container bg-white/60 backdrop-blur-sm border border-primary/10 focus-within:border-primary/50 focus-within:bg-white/80 h-10 md:h-11 transition-all shadow-none rounded-md px-3"
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="gender" className="text-sm">
                        الجنس
                      </Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) =>
                          handleInputChange("gender", value)
                        }
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className={inputClassName}>
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

                {/* Professional Info */}
                <div className="space-y-3 md:space-y-4">
                  <FormSectionHeader title="المعلومات المهنية" />

                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="companyName" className="text-sm">
                        اسم الشركة / المؤسسة
                      </Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) =>
                          handleInputChange("companyName", e.target.value)
                        }
                        placeholder="اسم الشركة"
                        disabled={isSubmitting}
                        className={inputClassName}
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="position" className="text-sm">
                        المنصب / الوظيفة
                      </Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) =>
                          handleInputChange("position", e.target.value)
                        }
                        placeholder="المنصب الوظيفي"
                        disabled={isSubmitting}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="activityType" className="text-sm">
                      نوع النشاط
                    </Label>
                    <Input
                      id="activityType"
                      value={formData.activityType}
                      onChange={(e) =>
                        handleInputChange("activityType", e.target.value)
                      }
                      placeholder="مثال: تجارة، تقنية، استشارات"
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </div>

                  {session?.showRegistrationPurpose && (
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="goal" className="text-sm">
                        ماذا تتمنى من الانضمام؟
                      </Label>
                      <Textarea
                        id="goal"
                        value={formData.goal}
                        onChange={(e) =>
                          handleInputChange("goal", e.target.value)
                        }
                        placeholder="أخبرنا عن أهدافك من الانضمام للتجمع"
                        rows={3}
                        disabled={isSubmitting}
                        className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 transition-all shadow-none"
                      />
                    </div>
                  )}
                </div>

                {/* Social Media */}
                {session?.showSocialMediaFields && (
                  <div className="space-y-3 md:space-y-4">
                    <FormSectionHeader title="وسائل التواصل الاجتماعي (اختياري)" />

                    <div className="grid gap-3 md:gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <div className="space-y-1.5 md:space-y-2">
                        <Label htmlFor="instagram" className="text-sm">
                          Instagram
                        </Label>
                        <Input
                          id="instagram"
                          value={formData.instagram}
                          onChange={(e) =>
                            handleInputChange("instagram", e.target.value)
                          }
                          placeholder="اسم المستخدم"
                          disabled={isSubmitting}
                          dir="ltr"
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <Label htmlFor="snapchat" className="text-sm">
                          Snapchat
                        </Label>
                        <Input
                          id="snapchat"
                          value={formData.snapchat}
                          onChange={(e) =>
                            handleInputChange("snapchat", e.target.value)
                          }
                          placeholder="اسم المستخدم"
                          disabled={isSubmitting}
                          dir="ltr"
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-1.5 md:space-y-2 sm:col-span-2 md:col-span-1">
                        <Label htmlFor="twitter" className="text-sm">
                          X (Twitter)
                        </Label>
                        <Input
                          id="twitter"
                          value={formData.twitter}
                          onChange={(e) =>
                            handleInputChange("twitter", e.target.value)
                          }
                          placeholder="اسم المستخدم"
                          disabled={isSubmitting}
                          dir="ltr"
                          className={inputClassName}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Companions */}
                {session.maxCompanions > 0 && (
                  <CompanionSection
                    companions={companions}
                    maxCompanions={session.maxCompanions}
                    onAdd={handleAddCompanion}
                    onRemove={handleRemoveCompanion}
                    onChange={handleCompanionChange}
                    usePhoneInput
                  />
                )}

                {/* Sponsorship Section */}
                {session?.showCateringInterest && (
                  <div className="space-y-3 md:space-y-4">
                    <FormSectionHeader title="الرعاية" />
                    <SponsorshipSection
                      data={{
                        wantsToSponsor: formData.wantsToSponsor,
                        sponsorshipTypes: formData.sponsorshipTypes,
                        sponsorshipOtherText: formData.sponsorshipOtherText,
                        sponsorType: formData.sponsorType,
                        sponsorCompanyName: formData.sponsorCompanyName,
                      }}
                      onChange={(sponsorship: SponsorshipData) =>
                        setFormData({
                          ...formData,
                          ...sponsorship,
                        })
                      }
                      disabled={isSubmitting}
                      variant="card"
                    />
                  </div>
                )}

                {/* Create Account Option */}
                <div className="space-y-3 md:space-y-4">
                  <FormSectionHeader title="إنشاء حساب" />
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <Checkbox
                      id="createAccount"
                      checked={createAccount}
                      onCheckedChange={(checked) =>
                        setCreateAccount(checked === true)
                      }
                      disabled={isSubmitting}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="createAccount" className="cursor-pointer">
                        إنشاء حساب جديد
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        أنشئ حساباً لتتمكن من تتبع تسجيلاتك والحصول على ميزات
                        إضافية
                      </p>
                    </div>
                  </div>

                  {createAccount && (
                    <div className="pr-7">
                      <PasswordField
                        id="password"
                        label="كلمة المرور"
                        value={formData.password}
                        onChange={(value) =>
                          handleInputChange("password", value)
                        }
                        required
                        disabled={isSubmitting}
                        placeholder="كلمة المرور (6 أحرف على الأقل)"
                        minLength={6}
                      />
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="space-y-4 pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-all hover:shadow-xl h-11 md:h-12 text-base md:text-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "جارٍ التسجيل..."
                      : session.requiresApproval
                      ? "تأكيد الطلب"
                      : "تأكيد التسجيل"}
                  </Button>

                  <div className="text-center text-xs md:text-sm text-foreground/70">
                    لديك حساب؟{" "}
                    <Link
                      href={`/user/login?callbackUrl=/session/${id}`}
                      className="font-semibold text-primary hover:text-primary/80 hover:underline"
                    >
                      سجل دخول
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </RegistrationPageLayout>
  );
}
