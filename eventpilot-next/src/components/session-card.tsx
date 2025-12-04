import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";
import { MapPin, User, Clock, ArrowLeft, Users, Calendar } from "lucide-react";

interface SessionCardProps {
  session: {
    id: string;
    title: string;
    sessionNumber: number;
    date: Date;
    location: string | null;
    status: string;
    guestName: string | null;
    registrationCount?: number | null;
    maxParticipants: number;
    isFull?: boolean;
    canRegister?: boolean;
  };
  showRegisterButton?: boolean;
}

export function SessionCard({ session, showRegisterButton = true }: SessionCardProps) {
  const sessionDate = new Date(session.date);

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: "bg-emerald-100", text: "text-emerald-700", label: "متاح للتسجيل" },
    closed: { bg: "bg-red-100", text: "text-red-700", label: "التسجيل مغلق" },
    completed: { bg: "bg-gray-100", text: "text-gray-600", label: "منعقدة" },
  };

  const status = statusConfig[session.status] || statusConfig.closed;
  const registrationPercent = session.registrationCount !== null && session.registrationCount !== undefined
    ? Math.round((session.registrationCount / session.maxParticipants) * 100)
    : null;

  return (
    <Card className="group border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>اللقاء #{session.sessionNumber}</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors">
              {session.title}
            </h3>
          </div>
          <Badge className={`${status.bg} ${status.text} border-0 shrink-0 px-3 py-1`}>
            {status.label}
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">التاريخ</p>
              <p className="font-medium text-gray-900">{formatArabicDate(sessionDate)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الوقت</p>
              <p className="font-medium text-gray-900">{formatArabicTime(sessionDate)}</p>
            </div>
          </div>

          {session.location && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المكان</p>
                <p className="font-medium text-gray-900">{session.location}</p>
              </div>
            </div>
          )}

          {session.guestName && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ضيف الجلسة</p>
                <p className="font-medium text-gray-900">{session.guestName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {registrationPercent !== null && (
          <div className="mb-6 p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>المسجلين</span>
              </div>
              <span className="text-sm font-semibold text-primary">
                {session.registrationCount} / {session.maxParticipants}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(registrationPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-left">
              {registrationPercent}% من المقاعد محجوزة
            </p>
          </div>
        )}

        {/* CTA Button */}
        {showRegisterButton && (
          <Button
            asChild
            className={`w-full h-12 text-base font-medium gap-2 ${
              session.canRegister
                ? "bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Link href={`/session/${session.id}`}>
              {session.isFull ? "الجلسة مكتملة" : session.canRegister ? "سجل الآن" : "عرض التفاصيل"}
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton for loading state
export function SessionCardSkeleton() {
  return (
    <Card className="border border-border/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
            <div className="h-7 bg-gray-200 rounded animate-pulse w-3/4" />
          </div>
          <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-gray-100 rounded animate-pulse w-12" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 rounded-xl space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-16" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-12" />
          </div>
          <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
        </div>

        <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
      </CardContent>
    </Card>
  );
}
