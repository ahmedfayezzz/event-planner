"use client";

import { use, useState } from "react";
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
import { ArrowLeft, UserPlus, X, UtensilsCrossed } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  SponsorshipSection,
  type SponsorshipData,
} from "@/components/registration/sponsorship-section";

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
  const [wantsToSponsor, setWantsToSponsor] = useState(false);
  const [sponsorshipTypes, setSponsorshipTypes] = useState<string[]>([]);
  const [sponsorshipOtherText, setSponsorshipOtherText] = useState("");
  const [sponsorType, setSponsorType] = useState<"person" | "company" | "">("");

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
    router.push(
      `/user/login?callbackUrl=/session/${sessionId}/member-register`
    );
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
        wantsToSponsor: isAlreadySponsor ? undefined : wantsToSponsor,
        sponsorshipTypes: isAlreadySponsor
          ? undefined
          : wantsToSponsor
          ? sponsorshipTypes
          : undefined,
        sponsorshipOtherText: isAlreadySponsor
          ? undefined
          : wantsToSponsor && sponsorshipTypes.includes("other")
          ? sponsorshipOtherText
          : undefined,
        sponsorType: isAlreadySponsor
          ? undefined
          : wantsToSponsor
          ? sponsorType || undefined
          : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadySponsor = userData?.sponsor != null;

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
                  <Badge variant="outline">
                    {companions.length} / {session.maxCompanions}
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

            {/* Sponsorship Section - Only show if user is not already a sponsor and session allows it */}
            {!isAlreadySponsor && session?.showCateringInterest && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5" />
                    الرعاية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SponsorshipSection
                    data={{
                      wantsToSponsor,
                      sponsorshipTypes,
                      sponsorshipOtherText,
                      sponsorType,
                    }}
                    onChange={(sponsorship: SponsorshipData) => {
                      setWantsToSponsor(sponsorship.wantsToSponsor);
                      setSponsorshipTypes(sponsorship.sponsorshipTypes);
                      setSponsorshipOtherText(sponsorship.sponsorshipOtherText);
                      setSponsorType(sponsorship.sponsorType);
                    }}
                  />
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
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "جارٍ التسجيل..." : "تأكيد التسجيل"}
              </Button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
