"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
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

interface WeekCellProps {
  weekNumber: number;
  weekLabel: string;
  sessions: SessionData[];
  dateLabel: string;
  onClick: () => void;
}

function SponsorAvatar({
  logoUrl,
  name,
}: {
  logoUrl: string | null;
  name: string | null;
}) {
  const { url } = usePresignedUrl(logoUrl);

  // If no logo, show full name in a circle
  if (!logoUrl || !url) {
    return (
      <div className="h-12 w-12 rounded-full bg-white border-2 border-background shadow-sm flex items-center justify-center p-1 overflow-hidden">
        <span className="text-[10px] font-semibold text-primary text-center line-clamp-2 leading-tight">
          {name || "؟"}
        </span>
      </div>
    );
  }

  return (
    <div className="h-12 w-12 rounded-full bg-white border-2 border-background shadow-sm flex items-center justify-center overflow-hidden p-1">
      <img
        src={url}
        alt={name ?? ""}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

export function WeekCell({
  weekNumber,
  weekLabel,
  sessions,
  dateLabel,
  onClick,
}: WeekCellProps) {
  // Collect all sponsors from sessions in this week
  const allSponsors: {
    id: string;
    name: string | null;
    logoUrl: string | null;
    type: string | null;
    isSelfSponsored: boolean;
  }[] = [];

  let totalCompletionRate = 0;

  sessions.forEach((session) => {
    totalCompletionRate += session.completionRate;

    const addSponsor = (slot: SponsorshipSlot | null) => {
      if (!slot) return;
      // Avoid duplicates
      const exists = allSponsors.some(
        (s) =>
          (slot.sponsorId && s.id === slot.sponsorId) ||
          (slot.isSelfSponsored && s.isSelfSponsored)
      );
      if (!exists) {
        allSponsors.push({
          id: slot.sponsorId ?? `self-${slot.id}`,
          name: slot.isSelfSponsored ? "رعاية ذاتية" : slot.sponsorName,
          logoUrl: slot.sponsorLogoUrl,
          type: slot.sponsorType,
          isSelfSponsored: slot.isSelfSponsored,
        });
      }
    };

    addSponsor(session.sponsorships.dinner);
    addSponsor(session.sponsorships.beverage);
    addSponsor(session.sponsorships.dessert);
    session.sponsorships.other.forEach(addSponsor);
  });

  const avgCompletionRate =
    sessions.length > 0 ? totalCompletionRate / sessions.length : 0;
  const hasSession = sessions.length > 0;

  // Determine border color based on completion
  const getBorderColor = () => {
    if (!hasSession) return "border-muted";
    if (avgCompletionRate === 100) return "border-green-500";
    if (avgCompletionRate > 0) return "border-yellow-500";
    return "border-red-500";
  };

  // Max 8 visible sponsors (2 rows of 4), show +N for overflow
  const visibleSponsors = allSponsors.slice(0, 8);
  const overflowCount = allSponsors.length - 8;

  // Split into two rows
  const firstRow = visibleSponsors.slice(0, 4);
  const secondRow = visibleSponsors.slice(4, 8);

  return (
    <button
      onClick={onClick}
      disabled={!hasSession}
      className={cn(
        "flex flex-col items-center p-4 rounded-xl border-2 transition-all min-h-[160px] w-full",
        getBorderColor(),
        hasSession
          ? "hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-card"
          : "cursor-default bg-muted/30 opacity-60"
      )}
    >
      {/* Week Label */}
      <div className="text-sm font-semibold text-foreground mb-1">
        {weekLabel}
      </div>

      {/* Date */}
      <div className="text-xs text-muted-foreground mb-3">
        {hasSession ? dateLabel : "لا توجد فعالية"}
      </div>

      {/* Sponsor Logos */}
      {hasSession && (
        <div className="flex-1 flex items-center justify-center">
          {allSponsors.length > 0 ? (
            <div className="flex flex-col items-center gap-1">
              {/* First row */}
              <div className="flex items-center -space-x-2 rtl:space-x-reverse">
                {firstRow.map((sponsor) => (
                  <SponsorAvatar
                    key={sponsor.id}
                    logoUrl={sponsor.logoUrl}
                    name={sponsor.name}
                  />
                ))}
              </div>
              {/* Second row (if needed) */}
              {secondRow.length > 0 && (
                <div className="flex items-center -space-x-2 rtl:space-x-reverse">
                  {secondRow.map((sponsor) => (
                    <SponsorAvatar
                      key={sponsor.id}
                      logoUrl={sponsor.logoUrl}
                      name={sponsor.name}
                    />
                  ))}
                  {overflowCount > 0 && (
                    <div className="h-12 w-12 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                      +{overflowCount}
                    </div>
                  )}
                </div>
              )}
              {/* Overflow indicator for first row only (if no second row) */}
              {secondRow.length === 0 && overflowCount > 0 && (
                <div className="h-12 w-12 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                  +{overflowCount}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <Calendar className="h-6 w-6 mb-1" />
              <span className="text-xs">بدون رعاية</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
