import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";

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
  const statusColors: Record<string, string> = {
    open: "bg-green-500/10 text-green-600 border-green-200",
    closed: "bg-red-500/10 text-red-600 border-red-200",
    completed: "bg-gray-500/10 text-gray-600 border-gray-200",
  };

  const statusLabels: Record<string, string> = {
    open: "مفتوح",
    closed: "مغلق",
    completed: "انتهت",
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{session.title}</CardTitle>
          <Badge variant="outline" className={statusColors[session.status]}>
            {statusLabels[session.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          التجمع رقم {session.sessionNumber}
        </p>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">التاريخ:</span>
            <span>{formatArabicDate(new Date(session.date))}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">الوقت:</span>
            <span>{formatArabicTime(new Date(session.date))}</span>
          </div>
          {session.location && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">المكان:</span>
              <span>{session.location}</span>
            </div>
          )}
          {session.guestName && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">الضيف:</span>
              <span>{session.guestName}</span>
            </div>
          )}
        </div>
        {session.registrationCount !== null && session.registrationCount !== undefined && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">المسجلين:</span>
              <span className="font-medium">
                {session.registrationCount} / {session.maxParticipants}
              </span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
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
      {showRegisterButton && (
        <CardFooter className="pt-0">
          <Button
            asChild
            className="w-full"
            variant={session.canRegister ? "default" : "secondary"}
            disabled={!session.canRegister}
          >
            <Link href={`/session/${session.id}`}>
              {session.isFull ? "مكتملة" : session.canRegister ? "سجل الآن" : "عرض التفاصيل"}
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
