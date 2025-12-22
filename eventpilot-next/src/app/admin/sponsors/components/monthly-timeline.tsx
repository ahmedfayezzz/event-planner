"use client";

import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatArabicDate } from "@/lib/utils";
import {
  User,
  Building2,
  ChevronLeft,
  UtensilsCrossed,
  GlassWater,
  Cake,
} from "lucide-react";
import { getSponsorshipTypeLabel } from "@/lib/constants";
import { usePresignedUrl } from "@/hooks/use-presigned-url";

interface SponsorshipSlot {
  id: string;
  sponsorId: string | null;
  sponsorName: string | null;
  sponsorLogoUrl: string | null;
  sponsorType: string | null;
  isSelfSponsored: boolean;
  notes: string | null;
}

interface SessionData {
  id: string;
  sessionNumber: number;
  title: string;
  date: Date;
  status: string;
  visibilityStatus: string;
  sponsorships: {
    dinner: SponsorshipSlot | null;
    beverage: SponsorshipSlot | null;
    dessert: SponsorshipSlot | null;
    other: SponsorshipSlot[];
  };
  completionRate: number;
}

interface MonthlyTimelineProps {
  sessions: SessionData[];
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  dinner: <UtensilsCrossed className="h-3 w-3" />,
  beverage: <GlassWater className="h-3 w-3" />,
  dessert: <Cake className="h-3 w-3" />,
};

function SponsorBadge({ slot, type }: { slot: SponsorshipSlot | null; type: string }) {
  if (!slot) {
    return (
      <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground">
        {TYPE_ICONS[type]}
        <span className="me-1">{getSponsorshipTypeLabel(type)}</span>
        <span>-</span>
      </Badge>
    );
  }

  if (slot.isSelfSponsored) {
    return (
      <Badge variant="secondary" className="text-xs">
        {TYPE_ICONS[type]}
        <span className="me-1">{getSponsorshipTypeLabel(type)}</span>
        <span>ذاتي</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-200">
      {TYPE_ICONS[type]}
      <span className="me-1">{getSponsorshipTypeLabel(type)}</span>
      <span className="truncate max-w-[80px]">{slot.sponsorName}</span>
    </Badge>
  );
}

function SessionCard({ session }: { session: SessionData }) {
  const isPast = new Date(session.date) < new Date();

  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-colors",
        isPast ? "bg-muted/30 opacity-75" : "bg-card hover:bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/admin/sessions/${session.id}`}
              className="font-medium hover:underline"
            >
              ثلوثية #{session.sessionNumber}
            </Link>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                session.completionRate === 100
                  ? "bg-green-500/10 text-green-600"
                  : session.completionRate > 0
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-red-500/10 text-red-600"
              )}
            >
              {session.completionRate}%
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            {formatArabicDate(new Date(session.date))}
          </p>

          {/* Progress bar */}
          <div className="mb-3 h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                session.completionRate === 100
                  ? "bg-green-500"
                  : session.completionRate > 0
                  ? "bg-yellow-500"
                  : "bg-red-500"
              )}
              style={{ width: `${session.completionRate}%` }}
            />
          </div>

          {/* Sponsorship badges */}
          <div className="flex flex-wrap gap-2">
            <SponsorBadge slot={session.sponsorships.dinner} type="dinner" />
            <SponsorBadge slot={session.sponsorships.beverage} type="beverage" />
            <SponsorBadge slot={session.sponsorships.dessert} type="dessert" />
          </div>
        </div>

        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/sessions/${session.id}/sponsorship`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function MonthlyTimeline({ sessions }: MonthlyTimelineProps) {
  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        لا توجد فعاليات في هذه الفترة
      </div>
    );
  }

  // Group sessions by month
  const sessionsByMonth = sessions.reduce((acc, session) => {
    const date = new Date(session.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (!acc[monthKey]) {
      acc[monthKey] = {
        label: date.toLocaleDateString("ar-SA", { month: "long", year: "numeric" }),
        sessions: [],
      };
    }
    acc[monthKey].sessions.push(session);
    return acc;
  }, {} as Record<string, { label: string; sessions: SessionData[] }>);

  return (
    <div className="p-4 space-y-6">
      {Object.entries(sessionsByMonth).map(([key, { label, sessions: monthSessions }]) => (
        <div key={key}>
          <h3 className="font-medium text-muted-foreground mb-3">{label}</h3>
          <div className="space-y-3">
            {monthSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
