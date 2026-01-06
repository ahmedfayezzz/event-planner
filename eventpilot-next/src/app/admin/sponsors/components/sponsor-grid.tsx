"use client";

import React, { useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatArabicDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  User,
  Building2,
  Loader2,
  Search,
  AlertCircle,
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
  sponsorshipType?: string;
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

interface SponsorGridProps {
  sessions: SessionData[];
}

interface SponsorRow {
  sponsorId: string | null;
  sponsorName: string;
  sponsorLogoUrl: string | null;
  sponsorType: string | null;
  isSelfSponsored: boolean;
  sessionSponsorships: Map<string, { type: string; slotId: string }[]>;
}

const SPONSORSHIP_TYPE_SHORT: Record<string, string> = {
  dinner: "عشاء",
  beverage: "مشروبات",
  dessert: "حلا",
  other: "أخرى",
};

function SponsorLogo({
  logoUrl,
  name,
  type,
  size = "md",
}: {
  logoUrl: string | null;
  name: string;
  type: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const { url } = usePresignedUrl(logoUrl);
  const sizeClass = size === "sm" ? "h-6 w-6" : size === "md" ? "h-8 w-8" : "h-10 w-10";

  return (
    <Avatar className={sizeClass}>
      {url && <AvatarImage src={url} alt={name} />}
      <AvatarFallback className="text-xs">
        {type === "company" ? (
          <Building2 className="h-4 w-4" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

function SponsorshipBadges({ types }: { types: { type: string; slotId: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {types.map((t, i) => (
        <Badge
          key={`${t.type}-${i}`}
          variant="secondary"
          className="text-xs bg-green-500/10 text-green-700 border-green-200"
        >
          {SPONSORSHIP_TYPE_SHORT[t.type] || t.type}
        </Badge>
      ))}
    </div>
  );
}

export function SponsorGrid({ sessions }: SponsorGridProps) {
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

  // Transform sessions data into sponsor-centric rows
  const { sponsorRows, sessionsNeedingSponsors } = useMemo(() => {
    const sponsorMap = new Map<string, SponsorRow>();
    const needsSponsors: SessionData[] = [];

    sessions.forEach((session) => {
      const allSponsorships: (SponsorshipSlot & { sponsorshipType: string })[] = [];

      // Collect all sponsorships from this session
      if (session.sponsorships.dinner) {
        allSponsorships.push({ ...session.sponsorships.dinner, sponsorshipType: "dinner" });
      }
      if (session.sponsorships.beverage) {
        allSponsorships.push({ ...session.sponsorships.beverage, sponsorshipType: "beverage" });
      }
      if (session.sponsorships.dessert) {
        allSponsorships.push({ ...session.sponsorships.dessert, sponsorshipType: "dessert" });
      }
      session.sponsorships.other.forEach((o) => {
        allSponsorships.push({ ...o, sponsorshipType: "other" });
      });

      // Check if session needs sponsors
      const hasAnySponsorship = allSponsorships.length > 0;
      if (!hasAnySponsorship) {
        needsSponsors.push(session);
      }

      // Group by sponsor
      allSponsorships.forEach((slot) => {
        const key = slot.isSelfSponsored
          ? "__self_sponsored__"
          : slot.sponsorId || "__unknown__";

        if (!sponsorMap.has(key)) {
          sponsorMap.set(key, {
            sponsorId: slot.isSelfSponsored ? null : slot.sponsorId,
            sponsorName: slot.isSelfSponsored ? "رعاية ذاتية" : slot.sponsorName || "غير معروف",
            sponsorLogoUrl: slot.sponsorLogoUrl,
            sponsorType: slot.sponsorType,
            isSelfSponsored: slot.isSelfSponsored,
            sessionSponsorships: new Map(),
          });
        }

        const sponsor = sponsorMap.get(key)!;
        if (!sponsor.sessionSponsorships.has(session.id)) {
          sponsor.sessionSponsorships.set(session.id, []);
        }
        sponsor.sessionSponsorships.get(session.id)!.push({
          type: slot.sponsorshipType,
          slotId: slot.id,
        });
      });
    });

    // Sort: self-sponsored last, then alphabetically
    const rows = Array.from(sponsorMap.values()).sort((a, b) => {
      if (a.isSelfSponsored && !b.isSelfSponsored) return 1;
      if (!a.isSelfSponsored && b.isSelfSponsored) return -1;
      return a.sponsorName.localeCompare(b.sponsorName, "ar");
    });

    return { sponsorRows: rows, sessionsNeedingSponsors: needsSponsors };
  }, [sessions]);

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

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        لا توجد فعاليات في هذه الفترة
      </div>
    );
  }

  const hasAnySponsors = sponsorRows.length > 0;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-right font-medium text-muted-foreground w-48 sticky right-0 bg-background">
                الراعي
              </th>
              {sessions.map((session) => (
                <th key={session.id} className="p-4 text-center min-w-[120px]">
                  <Link
                    href={`/admin/sessions/${session.id}`}
                    className="hover:underline"
                  >
                    <div className="font-medium">#{session.sessionNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatArabicDate(new Date(session.date))}
                    </div>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Sponsor rows */}
            {sponsorRows.map((sponsor) => (
              <tr key={sponsor.sponsorId || "__self__"} className="border-b hover:bg-muted/30">
                <td className="p-3 sticky right-0 bg-background">
                  <div className="flex items-center gap-3">
                    {sponsor.isSelfSponsored ? (
                      <Badge variant="secondary" className="text-sm">
                        رعاية ذاتية
                      </Badge>
                    ) : (
                      <>
                        <SponsorLogo
                          logoUrl={sponsor.sponsorLogoUrl}
                          name={sponsor.sponsorName}
                          type={sponsor.sponsorType}
                        />
                        <span className="font-medium truncate max-w-[120px]">
                          {sponsor.sponsorName}
                        </span>
                      </>
                    )}
                  </div>
                </td>
                {sessions.map((session) => {
                  const sponsorships = sponsor.sessionSponsorships.get(session.id);
                  return (
                    <td key={session.id} className="p-2 text-center">
                      {sponsorships ? (
                        <button
                          onClick={() =>
                            window.open(`/admin/sessions/${session.id}/sponsorship`, "_blank")
                          }
                          className="w-full p-2 rounded-md hover:bg-muted transition-colors"
                        >
                          <SponsorshipBadges types={sponsorships} />
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Empty state if no sponsors */}
            {!hasAnySponsors && (
              <tr>
                <td colSpan={sessions.length + 1} className="p-8 text-center text-muted-foreground">
                  لا يوجد رعاة في هذه الفترة
                </td>
              </tr>
            )}

            {/* Sessions needing sponsors section */}
            {sessionsNeedingSponsors.length > 0 && (
              <>
                <tr className="border-t-2 border-red-200">
                  <td
                    colSpan={sessions.length + 1}
                    className="p-3 bg-red-50/50 dark:bg-red-950/20"
                  >
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        فعاليات تحتاج رعاية ({sessionsNeedingSponsors.length})
                      </span>
                    </div>
                  </td>
                </tr>
                <tr className="bg-red-50/30 dark:bg-red-950/10">
                  <td className="p-3 text-muted-foreground text-sm">
                    إضافة راعي
                  </td>
                  {sessions.map((session) => {
                    const needsSponsor = sessionsNeedingSponsors.some((s) => s.id === session.id);
                    if (!needsSponsor) {
                      return <td key={session.id} className="p-2" />;
                    }
                    return (
                      <td key={session.id} className="p-2">
                        <button
                          onClick={() => handleOpenQuickAdd(session.id, "dinner")}
                          className="w-full h-12 flex items-center justify-center text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors rounded-md border border-dashed border-red-300"
                        >
                          <Plus className="h-4 w-4 me-1" />
                          <span className="text-xs">إضافة</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </>
            )}
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
                  إضافة راعي لـ <strong>ثلوثية #{selectedSession.sessionNumber}</strong>
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
