"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { WeekCell } from "./week-cell";
import { WeekDetailsDialog } from "./week-details-dialog";

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

interface MonthlyCalendarProps {
  year: number;
  month: number; // 0-indexed (0 = January)
  sessions: SessionData[];
}

const ARABIC_MONTHS: Record<number, string> = {
  0: "يناير",
  1: "فبراير",
  2: "مارس",
  3: "أبريل",
  4: "مايو",
  5: "يونيو",
  6: "يوليو",
  7: "أغسطس",
  8: "سبتمبر",
  9: "أكتوبر",
  10: "نوفمبر",
  11: "ديسمبر",
};

const ARABIC_WEEKS = [
  "الاسبوع الاول",
  "الاسبوع الثاني",
  "الاسبوع الثالث",
  "الاسبوع الرابع",
];

// Helper function to get the week number (1-4) of a date within its month
function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  // Calculate week based on day of month (1-7 = week 1, 8-14 = week 2, etc.)
  return Math.ceil(dayOfMonth / 7);
}

// Format day with Arabic numerals
function formatArabicDay(day: number): string {
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return day
    .toString()
    .split("")
    .map((d) => arabicNumerals[parseInt(d)])
    .join("");
}

export function MonthlyCalendar({ year, month, sessions }: MonthlyCalendarProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Group sessions by week number
  const sessionsByWeek = useMemo(() => {
    const grouped: Record<number, SessionData[]> = { 1: [], 2: [], 3: [], 4: [] };

    sessions.forEach((session) => {
      const sessionDate = new Date(session.date);
      const weekNum = getWeekOfMonth(sessionDate);
      // Clamp to 1-4
      const clampedWeek = Math.min(Math.max(weekNum, 1), 4);
      grouped[clampedWeek].push(session);
    });

    return grouped;
  }, [sessions]);

  // Generate date label for each week (showing the session date if exists)
  const getWeekDateLabel = (weekNum: number): string => {
    const weekSessions = sessionsByWeek[weekNum];
    if (weekSessions.length === 0) return "";

    // Show the first session's date
    const sessionDate = new Date(weekSessions[0].date);
    const day = formatArabicDay(sessionDate.getDate());
    const monthName = ARABIC_MONTHS[sessionDate.getMonth()];
    return `${day} ${monthName}`;
  };

  const handleWeekClick = (weekNum: number) => {
    if (sessionsByWeek[weekNum].length > 0) {
      setSelectedWeek(weekNum);
      setDialogOpen(true);
    }
  };

  const monthName = ARABIC_MONTHS[month];

  return (
    <div className="space-y-6 p-4">
      {/* Month Name Badge */}
      <div className="flex justify-center">
        <Badge
          variant="secondary"
          className="text-lg px-6 py-2 rounded-full bg-primary/10 text-primary border-primary/20"
        >
          {monthName}
        </Badge>
      </div>

      {/* 2x2 Grid - RTL order: Week1 on right, Week2 on left per row */}
      <div dir="rtl" className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {ARABIC_WEEKS.map((label, index) => {
          const weekNum = index + 1;
          return (
            <WeekCell
              key={weekNum}
              weekNumber={weekNum}
              weekLabel={label}
              sessions={sessionsByWeek[weekNum]}
              dateLabel={getWeekDateLabel(weekNum)}
              onClick={() => handleWeekClick(weekNum)}
            />
          );
        })}
      </div>

      {/* Week Details Dialog */}
      {selectedWeek !== null && (
        <WeekDetailsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          weekNumber={selectedWeek}
          weekLabel={ARABIC_WEEKS[selectedWeek - 1]}
          sessions={sessionsByWeek[selectedWeek]}
        />
      )}
    </div>
  );
}
