"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CountdownTimer } from "@/components/countdown-timer";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";
import { toSaudiTime } from "@/lib/timezone";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  CheckCircle2,
  ArrowLeft,
  Share2,
  Link2,
  Twitter,
  Building2,
} from "lucide-react";
import { usePresignedUrl } from "@/hooks/use-presigned-url";
import { copyToClipboard, shareOnTwitter, shareOnWhatsApp } from "@/lib/utils";

function SponsorLogo({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const { url, isLoading } = usePresignedUrl(logoUrl);

  if (!logoUrl) {
    return (
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Building2 className="w-6 h-6 md:w-8 md:h-8 text-primary/60" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted animate-pulse" />
    );
  }

  return (
    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-white border border-border shadow-sm">
      <img
        src={url}
        alt={name}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function SessionDetailClient({ id }: { id: string }) {
  const { status: authStatus } = useSession();
  const { data: session, isLoading } = api.session.getById.useQuery({ id });
  const { data: registration } = api.session.checkRegistration.useQuery(
    { sessionId: id },
    { enabled: authStatus === "authenticated" }
  );

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
        <h1 className="text-3xl font-bold mb-4 text-primary">
          الحدث غير موجود
        </h1>
        <Button asChild size="lg" className="shadow-lg">
          <Link href="/sessions">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للأحداث
          </Link>
        </Button>
      </div>
    );
  }

  const sessionDate = new Date(session.date);
  const saudiDate = toSaudiTime(sessionDate);
  const day = saudiDate?.getDate() ?? sessionDate.getDate();
  const month =
    saudiDate?.toLocaleDateString("ar-SA", { month: "long", numberingSystem: "latn" }) ??
    sessionDate.toLocaleDateString("ar-SA", { month: "long", numberingSystem: "latn" });

  const isUpcoming = sessionDate > new Date();

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

  // Past events always show as "completed" regardless of their status
  const displayStatus = isUpcoming ? session.status : "completed";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <div className="relative h-40 md:h-56 lg:h-72 bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-pattern-sadu-chain opacity-[0.06]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>

        {/* Badges */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-wrap gap-2 md:gap-3">
          <Badge
            variant="secondary"
            className={`${
              statusColors[displayStatus]
            } backdrop-blur-md shadow-lg text-xs md:text-base px-2.5 py-1 md:px-4 md:py-1.5`}
          >
            {statusLabels[displayStatus]}
          </Badge>
        </div>

        {/* Share Button */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-md shadow-lg h-9 w-9 md:h-10 md:w-10"
              >
                <Share2 className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={async () => {
                  const url = window.location.href;
                  const success = await copyToClipboard(url);
                  if (success) {
                    toast.success("تم نسخ الرابط");
                  } else {
                    toast.error("فشل نسخ الرابط");
                  }
                }}
              >
                <Link2 className="ml-2 h-4 w-4" />
                نسخ الرابط
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const url = window.location.href;
                  shareOnTwitter(url, `${session.title} - ثلوثية الأعمال`);
                }}
              >
                <Twitter className="ml-2 h-4 w-4" />
                مشاركة على X
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const url = window.location.href;
                  shareOnWhatsApp(url, `${session.title} - ثلوثية الأعمال`);
                }}
              >
                <svg
                  className="ml-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                مشاركة على واتساب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                <div className="text-2xl md:text-4xl font-bold text-primary">
                  {day}
                </div>
                <div className="text-xs md:text-sm font-medium text-muted-foreground">
                  {month}
                </div>
              </div>

              <div className="space-y-4 md:space-y-6">
                {/* Title */}
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary leading-tight">
                    {session.title}
                  </h1>
                </div>

                {/* Registration CTA + Countdown - Only for upcoming events */}
                {isUpcoming && (
                  <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg md:rounded-xl p-4 md:p-6 border border-primary/10">
                    <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-6">
                      {/* Countdown Section */}
                      {session.showCountdown && (
                        <div className="w-full lg:w-auto lg:shrink-0">
                          <CountdownTimer targetDate={sessionDate} compact />
                        </div>
                      )}

                      {/* Divider - vertical on desktop, horizontal on mobile */}
                      {session.showCountdown && (
                        <div className="hidden lg:block w-px h-20 bg-border" />
                      )}
                      {session.showCountdown && (
                        <div className="lg:hidden w-full h-px bg-border" />
                      )}

                      {/* CTA Section */}
                      <div className="w-full lg:flex-1">
                        {registration?.registered && registration.registration ? (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
                            <div className="flex items-center gap-2 md:gap-3">
                              <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-emerald-600 shrink-0" />
                              <div>
                                <p className="font-bold text-base md:text-lg text-foreground">
                                  تم التسجيل بنجاح
                                </p>
                                <Badge
                                  variant={
                                    registration.registration.isApproved
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="mt-1 text-xs md:text-sm"
                                >
                                  {registration.registration.isApproved
                                    ? "✓ مؤكد"
                                    : "⏳ في انتظار الموافقة"}
                                </Badge>
                              </div>
                            </div>
                            {registration.registration.isApproved && (
                              <Button
                                variant="outline"
                                asChild
                                className="shadow w-full sm:w-auto"
                                size="sm"
                              >
                                <Link href="/user/registrations">
                                  عرض تفاصيل التسجيل
                                  <ArrowLeft className="w-4 h-4 mr-2" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        ) : session.canRegister ? (
                          <div className="flex flex-col items-center lg:items-start gap-3 md:gap-4">
                            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
                              <Button
                                asChild
                                size="default"
                                className="shadow-lg hover:shadow-xl transition-all w-full sm:w-auto md:text-base"
                              >
                                <Link
                                  href={
                                    authStatus === "authenticated"
                                      ? `/session/${id}/member-register`
                                      : `/user/login?callbackUrl=/session/${id}/member-register`
                                  }
                                >
                                  {session.requiresApproval
                                    ? "سجل طلبك كعضو"
                                    : authStatus !== "authenticated"
                                    ? "سجيل كعضو"
                                    : "احجز مكانك"}
                                </Link>
                              </Button>
                              {authStatus !== "authenticated" && (
                                <Button
                                  variant="outline"
                                  asChild
                                  size="default"
                                  className="w-full sm:w-auto"
                                >
                                  <Link href={`/session/${id}/guest-register`}>
                                    {session.requiresApproval
                                      ? "سجل طلبك كزائر"
                                      : "سجل كزائر"}
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3 py-2">
                            <p className="text-muted-foreground font-medium text-sm md:text-base text-center">
                              {session.isFull
                                ? "🔒 الحدث مكتمل العدد"
                                : "التسجيل مغلق لهذا الحدث"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Info Icons */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 pt-2 md:pt-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        التاريخ
                      </p>
                      <p className="font-medium text-foreground text-sm md:text-base truncate">
                        {formatArabicDate(sessionDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Clock className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        الوقت
                      </p>
                      <p className="font-medium text-foreground text-sm md:text-base">
                        {formatArabicTime(sessionDate)}
                      </p>
                    </div>
                  </div>

                  {session.location && (
                    <div className="flex items-center gap-2 md:gap-3 col-span-2">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          المكان
                        </p>
                        {session.locationUrl ? (
                          <a
                            href={session.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline text-sm md:text-base inline-flex items-center gap-1"
                          >
                            {session.location}
                            <ArrowLeft className="w-3 h-3 rotate-[135deg]" />
                          </a>
                        ) : (
                          <p className="font-medium text-foreground text-sm md:text-base">
                            {session.location}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {session.guestName && (
                    <div className="flex items-center gap-2 md:gap-3 col-span-2">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground shrink-0">
                        <User className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          ضيف الحدث
                        </p>
                        <p className="font-medium text-base md:text-lg text-foreground">
                          {session.guestName}
                        </p>
                        {session.guestProfile && (
                          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 line-clamp-2">
                            {session.guestProfile}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {session.description && (
                  <div className="pt-4 md:pt-6 border-t border-border">
                    <h3 className="font-semibold text-base md:text-lg mb-2 md:mb-3 text-primary">
                      الوصف
                    </h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                      {session.description}
                    </p>
                  </div>
                )}

                {/* Registration Progress */}
                {session.registrationCount !== null && (
                  <div className="pt-4 md:pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        <span className="font-medium text-foreground text-sm md:text-base">
                          المسجلين
                        </span>
                      </div>
                      <span className="font-bold text-base md:text-lg text-primary">
                        {session.registrationCount} / {session.maxParticipants}
                      </span>
                    </div>
                    <div className="h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            (session.registrationCount /
                              session.maxParticipants) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1.5 md:mt-2">
                      {Math.round(
                        (session.registrationCount / session.maxParticipants) *
                          100
                      )}
                      % من المقاعد محجوزة
                    </p>
                  </div>
                )}

                {/* Sponsors Section */}
                {session.sponsors && session.sponsors.length > 0 && (
                  <div className="pt-4 md:pt-6 border-t border-border">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4">
                      <Building2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                      <h3 className="font-semibold text-base md:text-lg text-primary">
                        الرعاة
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-4 md:gap-6 justify-center">
                      {session.sponsors.map((sponsor) => (
                        <div
                          key={sponsor.id}
                          className="flex flex-col items-center gap-2"
                        >
                          <SponsorLogo
                            logoUrl={sponsor.logoUrl}
                            name={sponsor.name}
                          />
                          <span className="text-xs md:text-sm font-medium text-foreground text-center max-w-[80px] md:max-w-[100px] line-clamp-2">
                            {sponsor.name}
                          </span>
                        </div>
                      ))}
                    </div>
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
