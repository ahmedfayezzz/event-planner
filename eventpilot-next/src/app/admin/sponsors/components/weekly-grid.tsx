"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatArabicDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  User,
  Building2,
  Loader2,
  Search,
} from "lucide-react";
import {
  SPONSORSHIP_TYPES,
  getSponsorshipTypeLabel,
} from "@/lib/constants";
import { usePresignedUrl } from "@/hooks/use-presigned-url";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface WeeklyGridProps {
  sessions: SessionData[];
}

const SPONSORSHIP_TYPE_LABELS: Record<string, string> = {
  dinner: "عشاء",
  beverage: "مشروبات",
  dessert: "حلا",
};

function SponsorLogo({
  logoUrl,
  name,
  type,
  size = "sm",
}: {
  logoUrl: string | null;
  name: string | null;
  type: string | null;
  size?: "sm" | "md";
}) {
  const { url } = usePresignedUrl(logoUrl);
  const sizeClass = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <Avatar className={sizeClass}>
      {url && <AvatarImage src={url} alt={name || ""} />}
      <AvatarFallback className="text-xs">
        {type === "company" ? (
          <Building2 className="h-3 w-3" />
        ) : (
          <User className="h-3 w-3" />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

function EmptyCell({
  sessionId,
  sponsorshipType,
  onAdd,
}: {
  sessionId: string;
  sponsorshipType: string;
  onAdd: (sessionId: string, type: string) => void;
}) {
  return (
    <button
      onClick={() => onAdd(sessionId, sponsorshipType)}
      className="w-full h-full min-h-[60px] flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors rounded-md border border-dashed border-muted-foreground/30 hover:border-primary/50"
    >
      <Plus className="h-4 w-4 me-1" />
      <span className="text-xs">إضافة</span>
    </button>
  );
}

function FilledCell({
  slot,
  onClick,
}: {
  slot: SponsorshipSlot;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-full min-h-[60px] p-2 flex flex-col items-center justify-center gap-1 rounded-md transition-colors",
        slot.isSelfSponsored
          ? "bg-purple-500/10 hover:bg-purple-500/20"
          : "bg-green-500/10 hover:bg-green-500/20"
      )}
    >
      {slot.isSelfSponsored ? (
        <Badge variant="secondary" className="text-xs">
          ذاتي
        </Badge>
      ) : (
        <>
          <SponsorLogo
            logoUrl={slot.sponsorLogoUrl}
            name={slot.sponsorName}
            type={slot.sponsorType}
          />
          <span className="text-xs font-medium truncate max-w-full">
            {slot.sponsorName}
          </span>
        </>
      )}
    </button>
  );
}

export function WeeklyGrid({ sessions }: WeeklyGridProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddContext, setQuickAddContext] = useState<{
    sessionId: string;
    sponsorshipType: string;
  } | null>(null);
  const [sponsorSearch, setSponsorSearch] = useState("");
  const [selectedSponsorId, setSelectedSponsorId] = useState<string | null>(null);
  const [isSelfSponsored, setIsSelfSponsored] = useState(false);
  const [notes, setNotes] = useState("");

  const utils = api.useUtils();

  // Find session title for the dialog
  const selectedSession = sessions.find((s) => s.id === quickAddContext?.sessionId);

  // Fetch available sponsors when dialog is open
  const { data: availableSponsors, isLoading: loadingSponsors } =
    api.sponsor.getAvailableForSession.useQuery(
      {
        search: sponsorSearch || undefined,
        sponsorshipType: quickAddContext?.sponsorshipType,
      },
      {
        enabled: quickAddOpen && !!quickAddContext?.sessionId,
      }
    );

  // Link to session mutation
  const linkToSession = api.sponsor.linkToSession.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة الرعاية بنجاح");
      utils.sponsor.getSponsorshipCalendar.invalidate();
      handleCloseQuickAdd();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة الرعاية");
    },
  });

  const handleOpenQuickAdd = (sessionId: string, sponsorshipType: string) => {
    setQuickAddContext({ sessionId, sponsorshipType });
    setQuickAddOpen(true);
  };

  const handleCloseQuickAdd = () => {
    setQuickAddOpen(false);
    setQuickAddContext(null);
    setSponsorSearch("");
    setSelectedSponsorId(null);
    setIsSelfSponsored(false);
    setNotes("");
  };

  const handleSubmitQuickAdd = () => {
    if (!quickAddContext) return;
    if (!isSelfSponsored && !selectedSponsorId) {
      toast.error("الرجاء اختيار راعي أو تحديد رعاية ذاتية");
      return;
    }

    linkToSession.mutate({
      sessionId: quickAddContext.sessionId,
      sponsorId: isSelfSponsored ? undefined : selectedSponsorId ?? undefined,
      sponsorshipType: quickAddContext.sponsorshipType,
      isSelfSponsored,
      notes: notes || undefined,
    });
  };

  const sponsorshipTypes = ["dinner", "beverage", "dessert"];

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        لا توجد فعاليات في هذه الفترة
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-right font-medium text-muted-foreground w-28">
                نوع الرعاية
              </th>
              {sessions.map((session) => (
                <th key={session.id} className="p-4 text-center min-w-[150px]">
                  <Link
                    href={`/admin/sessions/${session.id}`}
                    className="hover:underline"
                  >
                    <div className="font-medium">ثلوثية #{session.sessionNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatArabicDate(new Date(session.date))}
                    </div>
                  </Link>
                  <div className="mt-1">
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
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sponsorshipTypes.map((type) => (
              <tr key={type} className="border-b">
                <td className="p-4 font-medium">
                  {SPONSORSHIP_TYPE_LABELS[type]}
                </td>
                {sessions.map((session) => {
                  const slot = session.sponsorships[type as keyof typeof session.sponsorships];
                  // Handle the case where slot could be an array (for "other")
                  const singleSlot = Array.isArray(slot) ? slot[0] : slot;

                  return (
                    <td key={`${session.id}-${type}`} className="p-2">
                      {singleSlot ? (
                        <FilledCell
                          slot={singleSlot}
                          onClick={() =>
                            window.open(
                              `/admin/sessions/${session.id}/sponsorship`,
                              "_blank"
                            )
                          }
                        />
                      ) : (
                        <EmptyCell
                          sessionId={session.id}
                          sponsorshipType={type}
                          onAdd={handleOpenQuickAdd}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Add Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة رعاية</DialogTitle>
            <DialogDescription>
              {selectedSession && (
                <>
                  إضافة راعي {getSponsorshipTypeLabel(quickAddContext?.sponsorshipType ?? "")} لـ{" "}
                  <strong>ثلوثية #{selectedSession.sessionNumber}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Self-sponsored toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="selfSponsored"
                checked={isSelfSponsored}
                onCheckedChange={(checked) => {
                  setIsSelfSponsored(checked === true);
                  if (checked) setSelectedSponsorId(null);
                }}
              />
              <Label htmlFor="selfSponsored" className="cursor-pointer">
                رعاية ذاتية (بدون راعي)
              </Label>
            </div>

            {/* Sponsor search */}
            {!isSelfSponsored && (
              <div className="space-y-2">
                <Label>اختيار راعي</Label>
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن راعي..."
                    value={sponsorSearch}
                    onChange={(e) => setSponsorSearch(e.target.value)}
                    className="ps-10"
                  />
                </div>
                <ScrollArea className="h-[200px] border rounded-md">
                  {loadingSponsors ? (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : availableSponsors && availableSponsors.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {availableSponsors.map((sponsor) => (
                        <button
                          key={sponsor.id}
                          onClick={() => setSelectedSponsorId(sponsor.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-md transition-colors",
                            selectedSponsorId === sponsor.id
                              ? "bg-primary/10 border border-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <SponsorLogo
                            logoUrl={sponsor.logoUrl}
                            name={sponsor.name}
                            type={sponsor.type}
                            size="md"
                          />
                          <div className="flex-1 text-right">
                            <p className="font-medium">{sponsor.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sponsor.sponsorshipTypes
                                .map(getSponsorshipTypeLabel)
                                .join(" • ")}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      لا يوجد رعاة متاحون
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseQuickAdd}>
              إلغاء
            </Button>
            <Button
              onClick={handleSubmitQuickAdd}
              disabled={
                linkToSession.isPending ||
                (!isSelfSponsored && !selectedSponsorId)
              }
            >
              {linkToSession.isPending && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
