"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { toast } from "sonner";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import "react-phone-number-input/style.css";
import {
  SponsorshipSection,
  type SponsorshipData,
} from "@/components/registration/sponsorship-section";
import {
  CompanionSection,
  RegistrationPageLayout,
  type Companion,
} from "@/components/forms";

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
  const [sponsorCompanyName, setSponsorCompanyName] = useState("");

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
      <RegistrationPageLayout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </RegistrationPageLayout>
    );
  }

  if (!session) {
    return (
      <RegistrationPageLayout>
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
      </RegistrationPageLayout>
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
        sponsorCompanyName: isAlreadySponsor
          ? undefined
          : wantsToSponsor && sponsorType === "company"
          ? sponsorCompanyName || undefined
          : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadySponsor = userData?.sponsors && userData.sponsors.length > 0;

  return (
    <RegistrationPageLayout>
      <div className="container py-8 md:py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Back Link */}
          <Link
            href={`/session/${sessionId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة لتفاصيل الحدث
          </Link>

          {/* Page Header */}
          <div className="text-center mb-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
              التسجيل في الحدث
            </h2>
            <p className="mt-2 text-xs md:text-sm text-muted-foreground">
              {session.title}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* User Info Card (Read-only) */}
              <Card className="bg-gradient-to-br from-white to-primary/3 backdrop-blur-xl border border-primary/10 shadow-lg rounded-xl md:rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="w-1.5 md:w-2 h-5 md:h-6 bg-accent rounded-full inline-block"></span>
                    معلوماتك
                  </CardTitle>
                  <CardDescription>
                    سيتم استخدام المعلومات المسجلة في حسابك
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">الاسم</p>
                      <p className="font-medium">{authSession?.user?.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        البريد الإلكتروني
                      </p>
                      <p className="font-medium" dir="ltr">
                        {authSession?.user?.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    asChild
                    className="px-0 text-primary hover:text-primary/80"
                  >
                    <Link href="/user/profile">تعديل المعلومات الشخصية</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Companions Section */}
              {session.maxCompanions > 0 && (
                <Card className="bg-gradient-to-br from-white to-primary/3 backdrop-blur-xl border border-primary/10 shadow-lg rounded-xl md:rounded-2xl">
                  <CardContent className="py-5 md:py-6 px-4 md:px-6">
                    <CompanionSection
                      companions={companions}
                      maxCompanions={session.maxCompanions}
                      onAdd={addCompanion}
                      onRemove={removeCompanion}
                      onChange={updateCompanion}
                      usePhoneInput
                    />
                  </CardContent>
                </Card>
              )}

              {/* Sponsorship Section - Only show if user is not already a sponsor and session allows it */}
              {!isAlreadySponsor && session?.showCateringInterest && (
                <Card className="bg-gradient-to-br from-white to-primary/3 backdrop-blur-xl border border-primary/10 shadow-lg rounded-xl md:rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="w-1.5 md:w-2 h-5 md:h-6 bg-accent rounded-full inline-block"></span>
                      <UtensilsCrossed className="w-5 h-5" />
                      الرعاية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <SponsorshipSection
                      data={{
                        wantsToSponsor,
                        sponsorshipTypes,
                        sponsorshipOtherText,
                        sponsorType,
                        sponsorCompanyName,
                      }}
                      onChange={(sponsorship: SponsorshipData) => {
                        setWantsToSponsor(sponsorship.wantsToSponsor);
                        setSponsorshipTypes(sponsorship.sponsorshipTypes);
                        setSponsorshipOtherText(sponsorship.sponsorshipOtherText);
                        setSponsorType(sponsorship.sponsorType);
                        setSponsorCompanyName(sponsorship.sponsorCompanyName);
                      }}
                      disabled={isSubmitting}
                      variant="card"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/session/${sessionId}`)}
                  disabled={isSubmitting}
                  className="flex-1 h-11 md:h-12 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-lg transition-all hover:shadow-xl h-11 md:h-12 text-base md:text-lg"
                >
                  {isSubmitting
                    ? "جارٍ التسجيل..."
                    : session.requiresApproval
                    ? "تأكيد الطلب"
                    : "تأكيد التسجيل"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </RegistrationPageLayout>
  );
}
