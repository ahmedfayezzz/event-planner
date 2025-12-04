"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
        <div className="h-40 md:h-56 bg-primary animate-pulse"></div>
        <div className="container -mt-20 md:-mt-32 px-4 pb-8 md:pb-12">
          <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            <Skeleton className="h-48 md:h-64 w-full rounded-xl" />
            <Skeleton className="h-32 md:h-48 w-full rounded-xl" />
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
      <div className="relative h-40 md:h-56 lg:h-72 bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>

        {/* Badges */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-wrap gap-2 md:gap-3">
          <Badge variant="secondary" className={`${statusColors[session.status]} backdrop-blur-md shadow-lg text-xs md:text-base px-2.5 py-1 md:px-4 md:py-1.5`}>
            {statusLabels[session.status]}
          </Badge>
          <Badge variant="outline" className="bg-black/30 text-white border-white/30 backdrop-blur-md text-xs md:text-base px-2.5 py-1 md:px-4 md:py-1.5">
            لقاء #{session.sessionNumber}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="container -mt-20 md:-mt-32 pb-8 md:pb-12 relative z-10 px-4">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          {/* Main Info Card - Frosted Glass */}
          <Card className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-xl md:rounded-2xl shadow-2xl relative">
            <CardContent className="p-4 pt-14 sm:p-6 sm:pt-6 md:p-8 md:pt-8 lg:p-10 lg:pt-10">
              {/* Date Badge */}
              <div className="absolute -top-8 md:-top-12 right-4 md:right-8 bg-white rounded-xl md:rounded-2xl shadow-xl p-2.5 md:p-4 text-center min-w-[70px] md:min-w-[100px] border-2 md:border-4 border-white">
                <div className="text-2xl md:text-4xl font-bold text-primary">{day}</div>
                <div className="text-xs md:text-sm font-medium text-muted-foreground">{month}</div>
              </div>

              <div className="space-y-4 md:space-y-6">
                {/* Title */}
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary leading-tight">
                    {session.title}
                  </h1>
                </div>

                {/* Registration CTA + Countdown - Combined */}
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg md:rounded-xl p-4 md:p-6 border border-primary/10">
                  <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-6">
                    {/* Countdown Section */}
                    {isUpcoming && session.showCountdown && (
                      <div className="w-full lg:w-auto lg:shrink-0">
                        <CountdownTimer targetDate={sessionDate} compact />
                      </div>
                    )}

                    {/* Divider - vertical on desktop, horizontal on mobile */}
                    {isUpcoming && session.showCountdown && (
                      <div className="hidden lg:block w-px h-20 bg-border" />
                    )}
                    {isUpcoming && session.showCountdown && (
                      <div className="lg:hidden w-full h-px bg-border" />
                    )}

                    {/* CTA Section */}
                    <div className="w-full lg:flex-1">
                      {registration?.registered && registration.registration ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
                          <div className="flex items-center gap-2 md:gap-3">
                            <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-emerald-600 shrink-0" />
                            <div>
                              <p className="font-bold text-base md:text-lg text-foreground">تم التسجيل بنجاح</p>
                              <Badge
                                variant={registration.registration.isApproved ? "default" : "secondary"}
                                className="mt-1 text-xs md:text-sm"
                              >
                                {registration.registration.isApproved ? "✓ مؤكد" : "⏳ في انتظار الموافقة"}
                              </Badge>
                            </div>
                          </div>
                          {registration.registration.isApproved && (
                            <Button variant="outline" asChild className="shadow w-full sm:w-auto" size="sm">
                              <Link href="/user/dashboard">
                                عرض تفاصيل التسجيل
                                <ArrowLeft className="w-4 h-4 mr-2" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      ) : session.canRegister ? (
                        <div className="flex flex-col items-center lg:items-start gap-3 md:gap-4">
                          {session.requiresApproval && (
                            <p className="text-xs md:text-sm text-amber-700 text-center lg:text-right">
                              ⓘ هذه الجلسة تتطلب موافقة على التسجيل
                            </p>
                          )}
                          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
                            <Button
                              onClick={handleRegister}
                              disabled={isRegistering}
                              size="default"
                              className="shadow-lg hover:shadow-xl transition-all w-full sm:w-auto md:text-base"
                            >
                              {authStatus !== "authenticated"
                                ? "سجل دخول للتسجيل"
                                : isRegistering
                                  ? "جارٍ التسجيل..."
                                  : "سجل الآن"}
                            </Button>
                            {authStatus !== "authenticated" && (
                              <Button variant="outline" asChild size="default" className="w-full sm:w-auto">
                                <Link href={`/session/${id}/guest-register`}>
                                  سجل كزائر
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3 py-2">
                          <p className="text-muted-foreground font-medium text-sm md:text-base text-center">
                            {session.isFull ? "🔒 الجلسة مكتملة العدد" : "التسجيل مغلق لهذه الجلسة"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Info Icons */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 pt-2 md:pt-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] md:text-xs text-muted-foreground">التاريخ</p>
                      <p className="font-medium text-foreground text-sm md:text-base truncate">{formatArabicDate(sessionDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Clock className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] md:text-xs text-muted-foreground">الوقت</p>
                      <p className="font-medium text-foreground text-sm md:text-base">{formatArabicTime(sessionDate)}</p>
                    </div>
                  </div>

                  {session.location && (
                    <div className="flex items-center gap-2 md:gap-3 col-span-2">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] md:text-xs text-muted-foreground">المكان</p>
                        <p className="font-medium text-foreground text-sm md:text-base">{session.location}</p>
                      </div>
                    </div>
                  )}

                  {session.guestName && (
                    <div className="flex items-center gap-2 md:gap-3 col-span-2">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground shrink-0">
                        <User className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-xs text-muted-foreground">ضيف الجلسة</p>
                        <p className="font-medium text-base md:text-lg text-foreground">{session.guestName}</p>
                        {session.guestProfile && (
                          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 line-clamp-2">{session.guestProfile}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {session.description && (
                  <div className="pt-4 md:pt-6 border-t border-border">
                    <h3 className="font-semibold text-base md:text-lg mb-2 md:mb-3 text-primary">نبذة عن الجلسة</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm md:text-base">{session.description}</p>
                  </div>
                )}

                {/* Registration Progress */}
                {session.registrationCount !== null && (
                  <div className="pt-4 md:pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        <span className="font-medium text-foreground text-sm md:text-base">المسجلين</span>
                      </div>
                      <span className="font-bold text-base md:text-lg text-primary">
                        {session.registrationCount} / {session.maxParticipants}
                      </span>
                    </div>
                    <div className="h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((session.registrationCount / session.maxParticipants) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1.5 md:mt-2">
                      {Math.round((session.registrationCount / session.maxParticipants) * 100)}% من المقاعد محجوزة
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
