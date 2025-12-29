"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SPONSORSHIP_TYPES, SPONSOR_TYPES } from "@/lib/constants";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

function BecomeSponsorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "" as "person" | "company" | "",
    companyName: "",
    sponsorshipTypes: [] as string[],
    sponsorshipOtherText: "",
    notes: "",
  });

  const submitMutation = api.sponsor.publicSubmit.useMutation({
    onSuccess: () => {
      router.push("/become-sponsor?success=true");
    },
    onError: (error) => {
      setError(error.message || "حدث خطأ، يرجى المحاولة مرة أخرى");
      setIsLoading(false);
    },
  });

  const handleSponsorshipTypeToggle = (typeValue: string, checked: boolean) => {
    const types = checked
      ? [...formData.sponsorshipTypes, typeValue]
      : formData.sponsorshipTypes.filter((t) => t !== typeValue);
    setFormData({ ...formData, sponsorshipTypes: types });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("الاسم مطلوب");
      return;
    }

    if (!formData.email.trim()) {
      setError("البريد الإلكتروني مطلوب");
      return;
    }

    if (!formData.phone.trim()) {
      setError("رقم الهاتف مطلوب");
      return;
    }

    if (!formData.type) {
      setError("يرجى اختيار نوع الراعي");
      return;
    }

    if (formData.type === "company" && !formData.companyName.trim()) {
      setError("اسم الشركة مطلوب");
      return;
    }

    setIsLoading(true);

    submitMutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      type: formData.type,
      companyName: formData.companyName || null,
      sponsorshipTypes: formData.sponsorshipTypes,
      sponsorshipOtherText: formData.sponsorshipOtherText || null,
      notes: formData.notes || null,
    });
  };

  // Success UI
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-8 md:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-pattern-dots opacity-[0.08]"></div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>

        <Card className="w-full max-w-md bg-gradient-to-br from-white to-primary/3 backdrop-blur-xl border border-primary/10 shadow-2xl rounded-xl md:rounded-2xl relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl md:text-3xl text-primary">
              شكراً لاهتمامك!
            </CardTitle>
            <CardDescription className="text-base mt-2">
              تم استلام طلبك بنجاح
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4 px-6">
            <p className="text-muted-foreground">
              سيتواصل معك أحد أعضاء فريقنا خلال الأيام القادمة لمناقشة فرص الرعاية
              المتاحة.
            </p>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-primary/80">
                تم إرسال بريد إلكتروني لتأكيد استلام طلبك
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <Button asChild variant="default" className="gap-2">
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
                العودة للرئيسية
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Form UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-8 md:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.08]"></div>
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-40 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-xl mx-auto relative z-10">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
            كن راعياً لفعالياتنا
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            ساهم في نجاح فعالياتنا واستمتع بفرص التواصل مع نخبة رواد الأعمال
          </p>
        </div>

        <Card className="bg-gradient-to-br from-white to-primary/3 backdrop-blur-xl border border-primary/10 shadow-2xl rounded-xl md:rounded-2xl">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">معلومات التواصل</CardTitle>
              <CardDescription>
                أدخل بياناتك وسنتواصل معك قريباً
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 md:space-y-5 px-4 md:px-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="name" className="text-sm">
                  الاسم الكامل *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  placeholder="أدخل اسمك الكامل"
                  className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="email" className="text-sm">
                  البريد الإلكتروني *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  dir="ltr"
                  placeholder="email@example.com"
                  className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                />
              </div>

              {/* Phone */}
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
                    setFormData({ ...formData, phone: value || "" })
                  }
                  disabled={isLoading}
                  className="phone-input-container bg-white/60 backdrop-blur-sm border border-primary/10 focus-within:border-primary/50 focus-within:bg-white/80 h-10 md:h-11 transition-all shadow-none rounded-md px-3"
                />
              </div>

              {/* Sponsor Type */}
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-sm">نوع الراعي *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "person" | "company") =>
                    setFormData({
                      ...formData,
                      type: value,
                      companyName: value === "person" ? "" : formData.companyName,
                    })
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none">
                    <SelectValue placeholder="اختر نوع الراعي" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPONSOR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Company Name (conditional) */}
              {formData.type === "company" && (
                <div className="space-y-1.5 md:space-y-2 animate-in fade-in-0">
                  <Label htmlFor="companyName" className="text-sm">
                    اسم الشركة / المؤسسة *
                  </Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    placeholder="أدخل اسم الشركة أو المؤسسة"
                    disabled={isLoading}
                    className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                  />
                </div>
              )}

              {/* Sponsorship Types */}
              <div className="space-y-2">
                <Label className="text-sm">نوع الرعاية المهتم بها</Label>
                <div className="grid gap-2 grid-cols-2">
                  {SPONSORSHIP_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`sponsorship-${type.value}`}
                        checked={formData.sponsorshipTypes.includes(type.value)}
                        onCheckedChange={(checked) =>
                          handleSponsorshipTypeToggle(type.value, checked === true)
                        }
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor={`sponsorship-${type.value}`}
                        className="cursor-pointer text-sm"
                      >
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Sponsorship Text (conditional) */}
              {formData.sponsorshipTypes.includes("other") && (
                <div className="space-y-1.5 md:space-y-2 animate-in fade-in-0">
                  <Label htmlFor="sponsorshipOtherText" className="text-sm">
                    حدد نوع الرعاية الأخرى
                  </Label>
                  <Input
                    id="sponsorshipOtherText"
                    value={formData.sponsorshipOtherText}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sponsorshipOtherText: e.target.value,
                      })
                    }
                    placeholder="اكتب تفاصيل نوع الرعاية..."
                    disabled={isLoading}
                    className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="notes" className="text-sm">
                  ملاحظات إضافية
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="أي ملاحظات أو استفسارات إضافية..."
                  rows={3}
                  disabled={isLoading}
                  className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 transition-all shadow-none resize-none"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 px-4 md:px-6 pb-6">
              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  "إرسال الطلب"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                سيتم التواصل معك خلال أيام العمل القادمة
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          لديك حساب بالفعل؟{" "}
          <Link
            href="/user/login"
            className="font-medium text-primary hover:underline"
          >
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function BecomeSponsorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <BecomeSponsorContent />
    </Suspense>
  );
}
