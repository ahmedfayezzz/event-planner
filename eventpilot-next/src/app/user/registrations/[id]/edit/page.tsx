"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, X, Loader2 } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface Companion {
  id?: string;
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
}

export default function EditRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: registrationId } = use(params);
  const router = useRouter();
  const { status: authStatus } = useSession();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companions, setCompanions] = useState<Companion[]>([]);

  // Fetch registration data
  const { data: registration, isLoading } =
    api.registration.getConfirmation.useQuery({
      registrationId,
    });

  const updateMutation = api.registration.updateRegistration.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث التسجيل بنجاح!");
      router.push("/user/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء التحديث");
    },
  });

  // Load companions when registration data is available
  useEffect(() => {
    if (registration?.companions) {
      setCompanions(
        registration.companions.map((c) => ({
          id: c.id,
          name: c.name || "",
          company: c.company || "",
          title: c.title || "",
          phone: c.phone || "",
          email: c.email || "",
        }))
      );
    }
  }, [registration]);

  // Redirect if not authenticated
  if (authStatus === "unauthenticated") {
    router.push(`/user/login?callbackUrl=/user/registrations/${registrationId}/edit`);
    return null;
  }

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-4">جاري التحميل...</p>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-3xl font-bold mb-4 text-primary">
          التسجيل غير موجود
        </h1>
        <Button asChild size="lg">
          <Link href="/user/dashboard">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للوحة التحكم
          </Link>
        </Button>
      </div>
    );
  }

  if (!registration.hasAccount) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-3xl font-bold mb-4 text-primary">
          غير مسموح بالتعديل
        </h1>
        <p className="text-muted-foreground mb-4">
          التسجيلات الخاصة بالزوار لا يمكن تعديلها
        </p>
        <Button asChild size="lg">
          <Link href="/user/dashboard">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للوحة التحكم
          </Link>
        </Button>
      </div>
    );
  }

  const addCompanion = () => {
    if (companions.length >= (registration.session?.maxCompanions || 5)) {
      toast.error("لقد وصلت للحد الأقصى من المرافقين");
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
          id: c.id,
          name: c.name,
          phone: c.phone,
          company: c.company || undefined,
          title: c.title || undefined,
          email: c.email || undefined,
        }));

      await updateMutation.mutateAsync({
        registrationId,
        companions: validCompanions,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-8 md:py-12 px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/user/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للوحة التحكم
          </Link>
          <h1 className="text-3xl font-bold text-primary mb-2">
            تعديل التسجيل
          </h1>
          <p className="text-muted-foreground">{registration.session.title}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Registration Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات التسجيل</CardTitle>
                <CardDescription>
                  تم التسجيل في{" "}
                  {new Date(registration.registeredAt).toLocaleDateString(
                    "ar-SA"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    حالة التسجيل
                  </span>
                  <Badge
                    variant={
                      registration.isApproved ? "default" : "secondary"
                    }
                  >
                    {registration.isApproved ? "✓ مؤكد" : "⏳ في انتظار الموافقة"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Companions Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      المرافقون
                    </CardTitle>
                    <CardDescription>
                      يمكنك تعديل معلومات المرافقين أو إضافة/حذف مرافقين
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {companions.length}
                  </Badge>
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={addCompanion}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4 ml-2" />
                  إضافة مرافق
                </Button>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/user/dashboard")}
                disabled={isSubmitting}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  "حفظ التعديلات"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
