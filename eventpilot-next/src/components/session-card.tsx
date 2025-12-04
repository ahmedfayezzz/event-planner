import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatArabicTime } from "@/lib/utils";
import { MapPin, User, Clock, ArrowLeft } from "lucide-react";

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
    image?: string | null;
  };
  showRegisterButton?: boolean;
}

export function SessionCard({ session, showRegisterButton = true }: SessionCardProps) {
  const sessionDate = new Date(session.date);
  const day = sessionDate.getDate();
  const month = sessionDate.toLocaleDateString("ar-SA", { month: "short" });

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

  return (
    <Card className="group flex flex-col md:flex-row h-full border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-white relative">
      {/* Image / Decorative Header Section */}
      <div className="relative w-full h-48 md:h-auto md:w-2/5 bg-primary overflow-hidden shrink-0">
        {session.image ? (
          <Image
            src={session.image}
            alt={session.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
          </>
        )}

        {/* Status Badge */}
        <div className="absolute top-4 left-4 z-10">
          <Badge variant="secondary" className={`${statusColors[session.status]} backdrop-blur-md shadow-sm`}>
            {statusLabels[session.status]}
          </Badge>
        </div>

        {/* Session Number Badge */}
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="outline" className="bg-black/20 text-white border-white/20 backdrop-blur-md">
            لقاء #{session.sessionNumber}
          </Badge>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 relative">
        <CardContent className="flex-1 pt-8 px-6 pb-2">
          {/* Date Badge - Positioned differently for mobile/desktop */}
          <div className="absolute -top-6 left-6 md:top-6 md:left-6 md:right-auto bg-white rounded-xl shadow-lg p-3 text-center min-w-[80px] border border-gray-100 z-20">
            <div className="text-3xl font-bold text-primary">{day}</div>
            <div className="text-sm font-medium text-muted-foreground">{month}</div>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors pt-2 md:pt-0">
              {session.title}
            </h3>

            {/* Details Grid */}
            <div className="space-y-3">
              {session.guestName && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{session.guestName}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary/60 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-sm">{formatArabicTime(sessionDate)}</span>
              </div>

              {session.location && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary/60 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm truncate">{session.location}</span>
                </div>
              )}
            </div>

            {/* Progress Bar (if applicable) */}
            {session.registrationCount !== null && session.registrationCount !== undefined && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>نسبة التسجيل</span>
                  <span>{Math.round((session.registrationCount / session.maxParticipants) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((session.registrationCount / session.maxParticipants) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {showRegisterButton && (
          <CardFooter className="pt-2 pb-6 px-6">
            <Button
              asChild
              className="w-full bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all h-12 text-base font-medium group/btn"
              variant={session.canRegister ? "default" : "secondary"}
              disabled={!session.canRegister}
            >
              <Link href={`/session/${session.id}`} className="flex items-center justify-center gap-2">
                {session.isFull ? "مكتملة" : session.canRegister ? "سجل الآن" : "عرض التفاصيل"}
                <ArrowLeft className="w-4 h-4 group-hover/btn:-translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardFooter>
        )}
      </div>
    </Card>
  );
}
