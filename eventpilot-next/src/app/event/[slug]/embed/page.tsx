"use client";

import { use, useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownTimer } from "@/components/countdown-timer";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";

export default function EventEmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  // Try to get session by slug first
  const { data: session, isLoading, error } = api.session.getBySlug.useQuery(
    { slug },
    { retry: false }
  );

  // If slug fails, try by ID
  const { data: sessionById, isLoading: loadingById } = api.session.getById.useQuery(
    { id: slug },
    { enabled: !session && !isLoading && !!error }
  );

  const displaySession = session || sessionById;
  const isLoadingSession = isLoading || (loadingById && !session);

  if (isLoadingSession) {
    return (
      <div className="p-4 min-h-screen bg-background">
        <div className="max-w-md mx-auto">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!displaySession) {
    return (
      <div className="p-4 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold mb-2">الجلسة غير موجودة</h2>
          <p className="text-muted-foreground text-sm">
            تأكد من صحة الرابط
          </p>
        </div>
      </div>
    );
  }

  if (!displaySession.embedEnabled) {
    return (
      <div className="p-4 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold mb-2">التضمين غير مفعل</h2>
          <p className="text-muted-foreground text-sm">
            هذه الجلسة لا تدعم التضمين
          </p>
        </div>
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

  const isUpcoming = new Date(displaySession.date) > new Date();

  // Build the full registration URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const registrationUrl = `${baseUrl}/session/${displaySession.id}/guest-register`;

  return (
    <div className="p-4 min-h-screen bg-background" dir="rtl">
      <Card className="max-w-md mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight">{displaySession.title}</CardTitle>
              <CardDescription>التجمع رقم {displaySession.sessionNumber}</CardDescription>
            </div>
            <Badge variant="outline" className={`text-xs ${statusColors[displaySession.status]}`}>
              {statusLabels[displaySession.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date/Time Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">التاريخ</p>
              <p className="font-medium">{formatArabicDate(new Date(displaySession.date))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">الوقت</p>
              <p className="font-medium">{formatArabicTime(new Date(displaySession.date))}</p>
            </div>
          </div>

          {/* Location */}
          {displaySession.location && (
            <div className="text-sm">
              <p className="text-muted-foreground text-xs">المكان</p>
              <p className="font-medium">{displaySession.location}</p>
            </div>
          )}

          {/* Countdown */}
          {isUpcoming && displaySession.showCountdown && (
            <div className="py-2">
              <CountdownTimer targetDate={new Date(displaySession.date)} compact />
            </div>
          )}

          {/* Registration Progress */}
          {displaySession.registrationCount !== null && displaySession.showParticipantCount && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">المسجلين</span>
                <span className="font-medium">
                  {displaySession.registrationCount} / {displaySession.maxParticipants}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${Math.min((displaySession.registrationCount / displaySession.maxParticipants) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Register Button */}
          {displaySession.canRegister ? (
            <Button className="w-full" asChild>
              <a
                href={registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                سجل الآن
              </a>
            </Button>
          ) : (
            <Button className="w-full" disabled>
              {displaySession.isFull ? "الجلسة مكتملة" : "التسجيل مغلق"}
            </Button>
          )}

          {/* Guest Info */}
          {displaySession.guestName && displaySession.showGuestProfile && (
            <div className="pt-2 border-t text-center">
              <p className="text-xs text-muted-foreground">ضيف الجلسة</p>
              <p className="font-medium text-sm">{displaySession.guestName}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Powered By */}
      <div className="text-center mt-4">
        <p className="text-xs text-muted-foreground">
          تم الإنشاء بواسطة{" "}
          <a
            href={baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            EventPilot
          </a>
        </p>
      </div>
    </div>
  );
}
