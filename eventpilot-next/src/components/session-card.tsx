import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";
import { MapPin, User, ArrowLeft, Users, Calendar } from "lucide-react";

interface SessionGuest {
  guest: {
    id: string;
    name: string;
    title: string | null;
    imageUrl: string | null;
    isPublic: boolean;
  };
}

interface SessionCardProps {
  session: {
    id: string;
    title: string;
    sessionNumber: number;
    date: Date;
    location: string | null;
    status: string;
    sessionGuests?: SessionGuest[];
    registrationCount?: number | null;
    maxParticipants: number;
    isFull?: boolean;
    canRegister?: boolean;
    requiresApproval?: boolean;
    isRegistered?: boolean;
  };
  showRegisterButton?: boolean;
}

export function SessionCard({
  session,
  showRegisterButton = true,
}: SessionCardProps) {
  const sessionDate = new Date(session.date);
  const isPast = sessionDate < new Date();

  const statusConfig: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    open: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      label: "متاح للتسجيل",
    },
    closed: { bg: "bg-red-100", text: "text-red-700", label: "التسجيل مغلق" },
    completed: { bg: "bg-gray-100", text: "text-gray-600", label: "منعقدة" },
  };

  // Past events always show as "completed" regardless of their status
  const status = isPast ? statusConfig.completed : (statusConfig[session.status] || statusConfig.closed);
  const registrationPercent =
    session.registrationCount !== null &&
    session.registrationCount !== undefined
      ? Math.round((session.registrationCount / session.maxParticipants) * 100)
      : null;

  return (
    <Card className="group bg-gradient-to-br from-white to-primary/5 backdrop-blur-xl border border-primary/10 shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden">
      <CardContent className="px-5">
        {/* Header - Primary focus */}
        <div className="space-y-1.5 mb-4">
          <Badge
            className={`${status.bg} ${status.text} border-0 px-2.5 py-0.5 text-xs font-medium`}
          >
            {status.label}
          </Badge>
          <h3 className="text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
            {session.title}
          </h3>
        </div>

        {/* Info Grid - Secondary info */}
        <div className="space-y-2.5 text-sm mb-4 pb-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-medium text-foreground">
              {formatArabicDate(sessionDate)} • {formatArabicTime(sessionDate)}
            </span>
          </div>

          {session.location && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground">{session.location}</span>
            </div>
          )}

          {session.sessionGuests && session.sessionGuests.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {session.sessionGuests[0].guest.title
                  ? `${session.sessionGuests[0].guest.title} ${session.sessionGuests[0].guest.name}`
                  : session.sessionGuests[0].guest.name}
                {session.sessionGuests.length > 1 && (
                  <span className="text-muted-foreground">
                    {" "}
                    +{session.sessionGuests.length - 1}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar - Tertiary info */}
        {registrationPercent !== null && (
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                المسجلين
              </span>
              <span className="font-semibold text-primary">
                {session.registrationCount} / {session.maxParticipants}
              </span>
            </div>
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-primary to-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.min(registrationPercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA Button - Action */}
        {showRegisterButton && (
          <Button
            asChild
            className={`w-full h-11 text-sm font-semibold gap-2 rounded-lg ${
              session.isRegistered
                ? "bg-accent hover:bg-accent/90 text-primary shadow-md hover:shadow-lg"
                : session.canRegister
                ? "bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Link href={`/session/${session.id}`}>
              {session.isRegistered
                ? "عرض التسجيل"
                : session.isFull
                ? "الحدث مكتمل"
                : session.canRegister
                ? session.requiresApproval
                  ? "سجل طلبك"
                  : "سجل الآن"
                : "عرض التفاصيل"}
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
    <Card className="bg-gradient-to-br from-white to-primary/5 backdrop-blur-xl border border-primary/10 shadow-lg rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="space-y-1.5 mb-4">
          <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
          <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
        </div>

        {/* Info Grid */}
        <div className="space-y-2.5 mb-4 pb-4 border-b border-border/30">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-7 h-7 bg-muted rounded-md animate-pulse shrink-0" />
              <div className="h-4 bg-muted rounded animate-pulse w-28" />
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between">
            <div className="h-3 bg-muted rounded animate-pulse w-14" />
            <div className="h-3 bg-muted rounded animate-pulse w-10" />
          </div>
          <div className="h-1.5 bg-muted rounded-full animate-pulse" />
        </div>

        {/* Button */}
        <div className="h-11 bg-muted rounded-lg animate-pulse" />
      </CardContent>
    </Card>
  );
}
