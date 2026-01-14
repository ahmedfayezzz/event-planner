"use client";

import React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatArabicDate } from "@/lib/utils";
import {
  ExternalLink,
  Utensils,
  Coffee,
  Cake,
  MoreHorizontal,
} from "lucide-react";
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

interface WeekDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekNumber: number;
  weekLabel: string;
  sessions: SessionData[];
}

const SPONSORSHIP_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  dinner: { label: "عشاء", icon: Utensils },
  beverage: { label: "مشروبات", icon: Coffee },
  dessert: { label: "حلا", icon: Cake },
  other: { label: "أخرى", icon: MoreHorizontal },
};

function SponsorDisplay({
  slot,
  type,
}: {
  slot: SponsorshipSlot | null;
  type: string;
}) {
  const { url } = usePresignedUrl(slot?.sponsorLogoUrl ?? null);
  const config = SPONSORSHIP_TYPE_CONFIG[type] || SPONSORSHIP_TYPE_CONFIG.other;
  const Icon = config.icon;

  // For "other" type, show the notes as the label if available
  const displayLabel = type === "other" && slot?.notes
    ? slot.notes
    : config.label;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{displayLabel}</span>
      </div>
      {slot ? (
        <div className="flex items-center gap-2">
          {slot.isSelfSponsored ? (
            <Badge variant="secondary">رعاية ذاتية</Badge>
          ) : (
            <>
              {url ? (
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={url} alt={slot.sponsorName ?? ""} className="object-contain p-0.5" />
                  <AvatarFallback className="text-[9px] bg-white text-primary font-medium p-1">
                    {slot.sponsorName || "؟"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-8 w-8 rounded-full bg-white border border-border flex items-center justify-center p-1 overflow-hidden">
                  <span className="text-[9px] font-semibold text-primary text-center line-clamp-2 leading-tight">
                    {slot.sponsorName || "؟"}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium">{slot.sponsorName}</span>
            </>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">---</span>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: SessionData }) {
  const getCompletionColor = (rate: number) => {
    if (rate === 100) return "bg-green-500";
    if (rate > 0) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Session Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">ثلوثية #{session.sessionNumber}</div>
          <div className="text-sm text-muted-foreground">
            {formatArabicDate(new Date(session.date))}
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/sessions/${session.id}/sponsorship`}>
            <ExternalLink className="h-4 w-4 me-1" />
            عرض التفاصيل
          </Link>
        </Button>
      </div>

      {/* Completion Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">نسبة الاكتمال</span>
          <span className="font-medium">{session.completionRate}%</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${getCompletionColor(session.completionRate)}`}
            style={{ width: `${session.completionRate}%` }}
          />
        </div>
      </div>

      <Separator />

      {/* Sponsorships */}
      <div className="space-y-1">
        <SponsorDisplay slot={session.sponsorships.dinner} type="dinner" />
        <SponsorDisplay slot={session.sponsorships.beverage} type="beverage" />
        <SponsorDisplay slot={session.sponsorships.dessert} type="dessert" />
        {session.sponsorships.other.map((slot, idx) => (
          <SponsorDisplay key={slot.id} slot={slot} type="other" />
        ))}
      </div>
    </div>
  );
}

export function WeekDetailsDialog({
  open,
  onOpenChange,
  weekNumber,
  weekLabel,
  sessions,
}: WeekDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="text-base px-3 py-1">
              {weekLabel}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {sessions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              لا توجد فعاليات في هذا الأسبوع
            </div>
          ) : (
            sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
