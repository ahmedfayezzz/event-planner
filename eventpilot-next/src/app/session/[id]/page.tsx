"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownTimer } from "@/components/countdown-timer";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, User, Users, CheckCircle2, ArrowLeft } from "lucide-react";

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: authSession, status: authStatus } = useSession();
  const [isRegistering, setIsRegistering] = useState(false);

  const { data: session, isLoading } = api.session.getById.useQuery({ id });
  const { data: registration } = api.session.checkRegistration.useQuery(
    { sessionId: id },
    { enabled: authStatus === "authenticated" }
  );

  const registerMutation = api.registration.registerForSession.useMutation({
    onSuccess: () => {
      toast.success("تم التسجيل بنجاح!");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء التسجيل");
    },
  });

  const handleRegister = async () => {
    if (authStatus !== "authenticated") {
      router.push(`/user/login?callbackUrl=/session/${id}`);
      return;
    }

    setIsRegistering(true);
    try {
      await registerMutation.mutateAsync({ sessionId: id });
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="h-96 bg-primary animate-pulse"></div>
        <div className="container -mt-32 pb-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-3xl font-bold mb-4 text-primary">الجلسة غير موجودة</h1>
        <Button asChild size="lg" className="shadow-lg">
          <Link href="/sessions">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للجلسات
          </Link>
        </Button>
      </div>
    );
  }

  const sessionDate = new Date(session.date);
  const day = sessionDate.getDate();
  const month = sessionDate.toLocaleDateString("ar-SA", { month: "long" });

  const statusColors: Record<string, string> = {
    open: "bg-emerald-100 text-emerald-800 border-emerald-200",
    closed: "bg-red-100 text-red-800 border-red-200",
    completed: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const statusLabels: Record<string, string> = {
    open: "متاح للتسجيل",
    closed: "التسجيل مغلق",
    completed: "منعقدة",
  };

  const isUpcoming = sessionDate > new Date();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <div className="relative h-56 md:h-72 bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>

        {/* Badges */}
        <div className="absolute top-6 left-6 flex gap-3">
          <Badge variant="secondary" className={`${statusColors[session.status]} backdrop-blur-md shadow-lg text-base px-4 py-1.5`}>
            {statusLabels[session.status]}
          </Badge>
          <Badge variant="outline" className="bg-black/30 text-white border-white/30 backdrop-blur-md text-base px-4 py-1.5">
            لقاء #{session.sessionNumber}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="container -mt-32 pb-12 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Info Card */}
          <Card className="border-none shadow-xl bg-white/95 backdrop-blur-md">
            <CardContent className="p-8 md:p-10">
              {/* Date Badge */}
              <div className="absolute -top-12 right-8 bg-white rounded-2xl shadow-xl p-4 text-center min-w-[100px] border-4 border-white">
                <div className="text-4xl font-bold text-primary">{day}</div>
                <div className="text-sm font-medium text-muted-foreground">{month}</div>
              </div>

              <div className="space-y-6 pt-4">
                {/* Title */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-2">
                    {session.title}
                  </h1>
                </div>

                {/* Quick Info Icons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">التاريخ</p>
                      <p className="font-medium">{formatArabicDate(sessionDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الوقت</p>
                      <p className="font-medium">{formatArabicTime(sessionDate)}</p>
                    </div>
                  </div>

                  {session.location && (
                    <div className="flex items-center gap-3 text-gray-700 md:col-span-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">المكان</p>
                        <p className="font-medium">{session.location}</p>
                      </div>
                    </div>
                  )}

                  {session.guestName && (
                    <div className="flex items-center gap-3 text-gray-700 md:col-span-2">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ضيف الجلسة</p>
                        <p className="font-medium text-lg">{session.guestName}</p>
                        {session.guestProfile && (
                          <p className="text-sm text-muted-foreground mt-1">{session.guestProfile}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {session.description && (
                  <div className="pt-6 border-t">
                    <h3 className="font-semibold text-lg mb-3 text-gray-900">نبذة عن الجلسة</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{session.description}</p>
                  </div>
                )}

                {/* Registration Progress */}
                {session.registrationCount !== null && (
                  <div className="pt-6 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <span className="font-medium text-gray-900">المسجلين</span>
                      </div>
                      <span className="font-bold text-lg text-primary">
                        {session.registrationCount} / {session.maxParticipants}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-secondary to-primary rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((session.registrationCount / session.maxParticipants) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {Math.round((session.registrationCount / session.maxParticipants) * 100)}% من المقاعد محجوزة
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Countdown */}
          {isUpcoming && session.showCountdown && (
            <Card className="border-none shadow-lg">
              <CardContent className="py-8">
                <CountdownTimer targetDate={sessionDate} />
              </CardContent>
            </Card>
          )}

          {/* Registration Card */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                {registration?.registered ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    تم التسجيل بنجاح
                  </>
                ) : (
                  "التسجيل في الجلسة"
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registration?.registered && registration.registration ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-emerald-200">
                    <p className="text-gray-700 mb-3">أنت مسجل في هذه الجلسة</p>
                    <Badge
                      variant={registration.registration.isApproved ? "default" : "secondary"}
                      className="text-base px-4 py-1.5"
                    >
                      {registration.registration.isApproved ? "✓ مؤكد" : "⏳ في انتظار الموافقة"}
                    </Badge>
                  </div>
                  {registration.registration.isApproved && (
                    <Button variant="outline" size="lg" asChild className="w-full shadow">
                      <Link href="/user/dashboard">
                        عرض تفاصيل التسجيل
                        <ArrowLeft className="w-4 h-4 mr-2" />
                      </Link>
                    </Button>
                  )}
                </div>
              ) : session.canRegister ? (
                <div className="space-y-4">
                  {session.requiresApproval && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">
                        ⓘ هذه الجلسة تتطلب موافقة على التسجيل
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={handleRegister}
                    disabled={isRegistering}
                    size="lg"
                    className="w-full shadow-lg hover:shadow-xl transition-all text-lg h-14"
                  >
                    {authStatus !== "authenticated"
                      ? "سجل دخول للتسجيل"
                      : isRegistering
                        ? "جارٍ التسجيل..."
                        : "سجل الآن في الجلسة"}
                  </Button>
                  {authStatus !== "authenticated" && (
                    <p className="text-center text-sm text-muted-foreground">
                      أو{" "}
                      <Link
                        href={`/session/${id}/guest-register`}
                        className="text-primary hover:underline font-medium"
                      >
                        سجل كزائر
                      </Link>
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600 font-medium">
                    {session.isFull ? "🔒 الجلسة مكتملة العدد" : "التسجيل مغلق لهذه الجلسة"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
