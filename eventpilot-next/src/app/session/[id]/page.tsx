"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownTimer } from "@/components/countdown-timer";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";
import { toast } from "sonner";

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
      <div className="container py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
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

  const statusColors: Record<string, string> = {
    open: "bg-green-500/10 text-green-600 border-green-200",
    closed: "bg-red-500/10 text-red-600 border-red-200",
    completed: "bg-gray-500/10 text-gray-600 border-gray-200",
  };

  const statusLabels: Record<string, string> = {
    open: "مفتوح للتسجيل",
    closed: "مغلق",
    completed: "انتهت",
  };

  const isUpcoming = new Date(session.date) > new Date();

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{session.title}</h1>
              <p className="text-muted-foreground mt-1">
                التجمع رقم {session.sessionNumber}
              </p>
            </div>
            <Badge variant="outline" className={statusColors[session.status]}>
              {statusLabels[session.status]}
            </Badge>
          </div>
        </div>

        {/* Countdown */}
        {isUpcoming && session.showCountdown && (
          <Card>
            <CardContent className="py-6">
              <CountdownTimer targetDate={new Date(session.date)} />
            </CardContent>
          </Card>
        )}

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الجلسة</CardTitle>
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

            {session.description && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">الوصف</p>
                <p className="whitespace-pre-wrap">{session.description}</p>
              </div>
            )}

            {session.guestName && session.showGuestProfile && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">ضيف الجلسة</p>
                <p className="font-medium">{session.guestName}</p>
                {session.guestProfile && (
                  <p className="text-sm text-muted-foreground mt-1">{session.guestProfile}</p>
                )}
              </div>
            )}

            {session.registrationCount !== null && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">المسجلين</p>
                  <p className="font-medium">
                    {session.registrationCount} / {session.maxParticipants}
                  </p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min((session.registrationCount / session.maxParticipants) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration */}
        <Card>
          <CardHeader>
            <CardTitle>التسجيل</CardTitle>
            <CardDescription>
              {registration?.registered
                ? "أنت مسجل في هذه الجلسة"
                : session.canRegister
                ? "سجل الآن لحجز مقعدك"
                : "التسجيل غير متاح حالياً"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registration?.registered && registration.registration ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={registration.registration.isApproved ? "default" : "secondary"}>
                    {registration.registration.isApproved ? "مؤكد" : "في انتظار الموافقة"}
                  </Badge>
                </div>
                {registration.registration.isApproved && (
                  <Button variant="outline" asChild>
                    <Link href={`/user/dashboard`}>عرض تفاصيل التسجيل</Link>
                  </Button>
                )}
              </div>
            ) : session.canRegister ? (
              <div className="space-y-4">
                {session.requiresApproval && (
                  <p className="text-sm text-muted-foreground">
                    * هذه الجلسة تتطلب موافقة على التسجيل
                  </p>
                )}
                <Button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="w-full md:w-auto"
                >
                  {authStatus !== "authenticated"
                    ? "سجل دخول للتسجيل"
                    : isRegistering
                    ? "جارٍ التسجيل..."
                    : "سجل الآن"}
                </Button>
                {authStatus !== "authenticated" && (
                  <p className="text-sm text-muted-foreground">
                    أو{" "}
                    <Link
                      href={`/session/${id}/guest-register`}
                      className="text-primary hover:underline"
                    >
                      سجل كزائر
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {session.isFull ? "الجلسة مكتملة العدد" : "التسجيل مغلق لهذه الجلسة"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
