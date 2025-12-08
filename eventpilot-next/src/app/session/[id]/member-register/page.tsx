"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, X, UtensilsCrossed } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { HOSTING_TYPES } from "@/lib/constants";

interface Companion {
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
}

export default function MemberRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const { data: authSession, status: authStatus } = useSession();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [wantsToHost, setWantsToHost] = useState(false);
  const [hostingTypes, setHostingTypes] = useState<string[]>([]);

  // Fetch session data
  const { data: session, isLoading } = api.session.getById.useQuery({
    id: sessionId,
  });

  // Fetch user data to check if already a host
  const { data: userData } = api.user.getMyProfile.useQuery(undefined, {
    enabled: authStatus === "authenticated",
  });

  const registerMutation = api.registration.registerForSession.useMutation({
    onSuccess: (data) => {
      toast.success("تم التسجيل بنجاح!");
      router.push(`/registration/${data.id}/confirmation`);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء التسجيل");
    },
  });

  // Redirect if not authenticated
  if (authStatus === "unauthenticated") {
    router.push(`/user/login?callbackUrl=/session/${sessionId}/member-register`);
    return null;
  }

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-3xl font-bold mb-4 text-primary">
          الحدث غير موجود
        </h1>
        <Button asChild size="lg">
          <Link href="/sessions">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للأحداث
          </Link>
        </Button>
      </div>
    );
  }

  const addCompanion = () => {
    if (companions.length >= session.maxCompanions) {
      toast.error(`الحد الأقصى للمرافقين هو ${session.maxCompanions}`);
      return;
    }
    setCompanions([
      ...companions,
      { name: "", company: "", title: "", phone: "", email: "" },
    ]);
  };

  const removeCompanion = (index: number) => {
    setCompanions(companions.filter((_, i) => i !== index));
  };

  const updateCompanion = (
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
    setIsSubmitting(true);

    try {
      // Filter out companions without required fields (name and phone)
      const validCompanions = companions
        .filter((c) => c.name.trim().length >= 2 && c.phone.trim().length >= 9)
        .map((c) => ({
          name: c.name,
          phone: c.phone,
          company: c.company || undefined,
          title: c.title || undefined,
          email: c.email || undefined,
        }));

      await registerMutation.mutateAsync({
        sessionId,
        companions: validCompanions,
        wantsToHost: userData?.wantsToHost ? undefined : wantsToHost,
        hostingTypes: userData?.wantsToHost ? undefined : (wantsToHost ? hostingTypes : undefined),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadyHost = userData?.wantsToHost || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-8 md:py-12 px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/session/${sessionId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة لتفاصيل الحدث
          </Link>
          <h1 className="text-3xl font-bold text-primary mb-2">
            التسجيل في الحدث
          </h1>
          <p className="text-muted-foreground">{session.title}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* User Info Card (Read-only) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلوماتك</CardTitle>
                <CardDescription>
                  سيتم استخدام المعلومات المسجلة في حسابك
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      الاسم
                    </Label>
                    <p className="font-medium">{authSession?.user?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      البريد الإلكتروني
                    </Label>
                    <p className="font-medium">{authSession?.user?.email}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  asChild
                  className="px-0"
                >
                  <Link href="/user/profile">تعديل المعلومات الشخصية</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Companions Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      المرافقون (اختياري)
                    </CardTitle>
                    <CardDescription>
                      يمكنك إضافة ما يصل إلى {session.maxCompanions} مرافقين
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{companions.length} / {session.maxCompanions}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {companions.map((companion, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-muted/30 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-semibold">
                        المرافق {index + 1}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCompanion(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`companion-${index}-name`}>
                          الاسم *
                        </Label>
                        <Input
                          id={`companion-${index}-name`}
                          value={companion.name}
                          onChange={(e) =>
                            updateCompanion(index, "name", e.target.value)
                          }
                          required
                          placeholder="الاسم الكامل"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`companion-${index}-phone`}>
                          رقم الهاتف *
                        </Label>
                        <PhoneInput
                          id={`companion-${index}-phone`}
                          international
                          defaultCountry="SA"
                          value={companion.phone}
                          onChange={(value) =>
                            updateCompanion(index, "phone", value || "")
                          }
                          className="phone-input-container"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`companion-${index}-company`}>
                          الشركة
                        </Label>
                        <Input
                          id={`companion-${index}-company`}
                          value={companion.company}
                          onChange={(e) =>
                            updateCompanion(index, "company", e.target.value)
                          }
                          placeholder="اسم الشركة"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`companion-${index}-title`}>
                          المنصب
                        </Label>
                        <Input
                          id={`companion-${index}-title`}
                          value={companion.title}
                          onChange={(e) =>
                            updateCompanion(index, "title", e.target.value)
                          }
                          placeholder="المنصب الوظيفي"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`companion-${index}-email`}>
                          البريد الإلكتروني
                        </Label>
                        <Input
                          id={`companion-${index}-email`}
                          type="email"
                          value={companion.email}
                          onChange={(e) =>
                            updateCompanion(index, "email", e.target.value)
                          }
                          placeholder="example@email.com"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {companions.length < session.maxCompanions && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCompanion}
                    className="w-full"
                  >
                    <UserPlus className="w-4 h-4 ml-2" />
                    إضافة مرافق
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Hosting Section - Only show if user is not already a host and session allows it */}
            {!isAlreadyHost && session?.showCateringInterest && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5" />
                    الضيافة (اختياري)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <Checkbox
                      id="wantsToHost"
                      checked={wantsToHost}
                      onCheckedChange={(checked) =>
                        setWantsToHost(checked === true)
                      }
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="wantsToHost" className="cursor-pointer">
                        هل تريد تقديم الضيافة في أحد أحداثنا القادمة؟
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        سوف يتم التواصل معكم لتحديد الاحتياج
                      </p>
                    </div>
                  </div>

                  {wantsToHost && (
                    <div className="pe-7 space-y-2 animate-in fade-in-0">
                      <Label className="text-sm">نوع الضيافة</Label>
                      <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                        {HOSTING_TYPES.map((type) => (
                          <div key={type.value} className="flex items-center gap-2">
                            <Checkbox
                              id={`hosting-${type.value}`}
                              checked={hostingTypes.includes(type.value)}
                              onCheckedChange={(checked) => {
                                const types = checked
                                  ? [...hostingTypes, type.value]
                                  : hostingTypes.filter((t) => t !== type.value);
                                setHostingTypes(types);
                              }}
                            />
                            <Label
                              htmlFor={`hosting-${type.value}`}
                              className="cursor-pointer text-sm"
                            >
                              {type.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/session/${sessionId}`)}
                disabled={isSubmitting}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "جارٍ التسجيل..." : "تأكيد التسجيل"}
              </Button>
            </div>

            {session.requiresApproval && (
              <p className="text-sm text-center text-amber-700">
                ⓘ هذا الحدث يتطلب موافقة على التسجيل. سيتم إرسال تأكيد بعد
                المراجعة.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
