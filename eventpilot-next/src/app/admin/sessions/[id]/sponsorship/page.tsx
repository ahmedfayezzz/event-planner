"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Trash2,
  Edit,
  Search,
  UtensilsCrossed,
  Phone,
  Building2,
  User,
  ChevronUp,
  ChevronDown,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import {
  SPONSORSHIP_TYPES,
  getSponsorshipTypeLabel,
  getSponsorTypeLabel,
} from "@/lib/constants";
import { usePresignedUrl } from "@/hooks/use-presigned-url";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Component to display sponsor logo with presigned URL support
const SponsorLogo = ({ logoUrl, name, type }: { logoUrl: string | null; name: string; type: string }) => {
  const { url: presignedUrl, isLoading } = usePresignedUrl(logoUrl);

  if (logoUrl && presignedUrl) {
    return (
      <div className="relative h-8 w-8 rounded-full overflow-hidden border bg-muted flex-shrink-0">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <img
            src={presignedUrl}
            alt={name}
            className="h-full w-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement?.classList.add("fallback");
            }}
          />
        )}
        <div className="hidden fallback:flex h-full w-full items-center justify-center">
          {type === "company" ? (
            <Building2 className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>
      </div>
    );
  }

  return (
    <Avatar className="h-8 w-8">
      <AvatarFallback>
        {type === "company" ? (
          <Building2 className="h-4 w-4" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </AvatarFallback>
    </Avatar>
  );
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SponsorshipPage({ params }: PageProps) {
  const { id } = use(params);
  const { isExpanded, toggleRow } = useExpandableRows();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSponsorId, setSelectedSponsorId] = useState<string | null>(null);
  const [selectedSponsorshipType, setSelectedSponsorshipType] = useState("");
  const [isSelfSponsored, setIsSelfSponsored] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data, isLoading, error } = api.sponsor.getSessionSponsorshipsAdmin.useQuery({
    sessionId: id,
  });

  const { data: availableSponsors } = api.sponsor.getAvailableForSession.useQuery({
    search: searchQuery,
    sponsorshipType: selectedSponsorshipType || undefined,
    limit: 20,
  });

  const addSponsorship = api.sponsor.linkToSession.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة الرعاية بنجاح");
      utils.sponsor.getSessionSponsorshipsAdmin.invalidate({ sessionId: id });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة الرعاية");
    },
  });

  const updateSponsorship = api.sponsor.updateSponsorship.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الرعاية بنجاح");
      utils.sponsor.getSessionSponsorshipsAdmin.invalidate({ sessionId: id });
      resetForm();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الرعاية");
    },
  });

  const deleteSponsorship = api.sponsor.unlinkFromSession.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الرعاية بنجاح");
      utils.sponsor.getSessionSponsorshipsAdmin.invalidate({ sessionId: id });
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف الرعاية");
    },
  });

  const updateDisplayOrder = api.sponsor.updateDisplayOrder.useMutation({
    onSuccess: () => {
      utils.sponsor.getSessionSponsorshipsAdmin.invalidate({ sessionId: id });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الترتيب");
    },
  });

  const moveSponsorship = (index: number, direction: "up" | "down") => {
    if (!data) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.sponsorships.length) return;

    // Create new order by swapping
    const orderedIds = data.sponsorships.map((s) => s.id);
    [orderedIds[index], orderedIds[newIndex]] = [orderedIds[newIndex]!, orderedIds[index]!];

    updateDisplayOrder.mutate({
      sessionId: id,
      orderedIds,
    });
  };

  const resetForm = () => {
    setSelectedSponsorId(null);
    setSelectedSponsorshipType("");
    setIsSelfSponsored(false);
    setNotes("");
    setEditingId(null);
    setSearchQuery("");
  };

  const handleAdd = () => {
    if (!selectedSponsorshipType) {
      toast.error("يرجى اختيار نوع الرعاية");
      return;
    }

    if (!isSelfSponsored && !selectedSponsorId) {
      toast.error("يرجى اختيار راعي أو تحديد الرعاية ذاتية");
      return;
    }

    addSponsorship.mutate({
      sessionId: id,
      sponsorId: isSelfSponsored ? undefined : selectedSponsorId || undefined,
      sponsorshipType: selectedSponsorshipType,
      isSelfSponsored,
      notes: notes || undefined,
    });
  };

  const handleEdit = () => {
    if (!editingId || !selectedSponsorshipType) {
      toast.error("يرجى اختيار نوع الرعاية");
      return;
    }

    updateSponsorship.mutate({
      id: editingId,
      sponsorId: isSelfSponsored ? null : selectedSponsorId,
      sponsorshipType: selectedSponsorshipType,
      isSelfSponsored,
      notes: notes || null,
    });
  };

  const openEditDialog = (sponsorship: {
    id: string;
    sponsorId: string | null;
    sponsorshipType: string;
    isSelfSponsored: boolean;
    notes: string | null;
  }) => {
    setEditingId(sponsorship.id);
    setSelectedSponsorId(sponsorship.sponsorId);
    setSelectedSponsorshipType(sponsorship.sponsorshipType);
    setIsSelfSponsored(sponsorship.isSelfSponsored);
    setNotes(sponsorship.notes || "");
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">الحدث غير موجود</h2>
        <Button asChild>
          <Link href="/admin/sessions">العودة للأحداث</Link>
        </Button>
      </div>
    );
  }

  const { session, sponsorships } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الرعاية</h1>
          <p className="text-muted-foreground">
            {session.title} - {formatArabicDate(new Date(session.date))}
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة رعاية
        </Button>
      </div>

      {/* Sponsorship List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الرعاية</CardTitle>
          <CardDescription>
            {sponsorships.length} عنصر رعاية مسجل
            {sponsorships.length > 1 && (
              <span className="text-xs mr-2">
                • الترتيب من اليمين لليسار (الأول يظهر على اليمين)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sponsorships.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد عناصر رعاية مسجلة لهذا الحدث</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="ml-2 h-4 w-4" />
                إضافة رعاية
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">الترتيب</TableHead>
                  <TableHead>نوع الرعاية</TableHead>
                  <TableHead>الراعي</TableHead>
                  <TableHead className="hidden md:table-cell">التواصل</TableHead>
                  <TableHead className="hidden lg:table-cell">ملاحظات</TableHead>
                  <TableHead className="hidden md:table-cell text-left">إجراءات</TableHead>
                  <TableHead className="md:hidden w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsorships.map((sponsorship, index) => {
                  const expanded = isExpanded(sponsorship.id);
                  const isFirst = index === 0;
                  const isLast = index === sponsorships.length - 1;
                  return (
                    <React.Fragment key={sponsorship.id}>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={isFirst || updateDisplayOrder.isPending}
                              onClick={() => moveSponsorship(index, "up")}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={isLast || updateDisplayOrder.isPending}
                              onClick={() => moveSponsorship(index, "down")}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    sponsorship.sponsorshipType === "other" &&
                                      sponsorship.sponsor?.sponsorshipOtherText &&
                                      "cursor-help"
                                  )}
                                >
                                  {getSponsorshipTypeLabel(sponsorship.sponsorshipType)}
                                  {sponsorship.sponsorshipType === "other" &&
                                    sponsorship.sponsor?.sponsorshipOtherText && (
                                      <Info className="h-3 w-3 mr-1" />
                                    )}
                                </Badge>
                              </TooltipTrigger>
                              {sponsorship.sponsorshipType === "other" &&
                                sponsorship.sponsor?.sponsorshipOtherText && (
                                  <TooltipContent>
                                    <p>{sponsorship.sponsor.sponsorshipOtherText}</p>
                                  </TooltipContent>
                                )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {sponsorship.isSelfSponsored ? (
                            <span className="text-muted-foreground">
                              رعاية ذاتية
                            </span>
                          ) : sponsorship.sponsor ? (
                            <div className="flex items-center gap-2">
                              <SponsorLogo
                                logoUrl={sponsorship.sponsor.logoUrl}
                                name={sponsorship.sponsor.name}
                                type={sponsorship.sponsor.type}
                              />
                              <div>
                                <p className="font-medium">{sponsorship.sponsor.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getSponsorTypeLabel(sponsorship.sponsor.type)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">غير محدد</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {sponsorship.sponsor ? (
                            <div className="text-sm">
                              {sponsorship.sponsor.phone ? (
                                <a
                                  href={`tel:${sponsorship.sponsor.phone}`}
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  {sponsorship.sponsor.phone}
                                </a>
                              ) : sponsorship.sponsor.email ? (
                                <a
                                  href={`mailto:${sponsorship.sponsor.email}`}
                                  className="text-primary hover:underline"
                                >
                                  {sponsorship.sponsor.email}
                                </a>
                              ) : (
                                "-"
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {sponsorship.notes ? (
                            <span className="text-sm text-muted-foreground">
                              {sponsorship.notes}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(sponsorship)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(sponsorship.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="md:hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRow(sponsorship.id)}
                          >
                            {expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      <tr className="md:hidden">
                        <td colSpan={4} className="p-0">
                          <div
                            className={cn(
                              "grid transition-all duration-300 ease-in-out",
                              expanded
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                            )}
                          >
                            <div className="overflow-hidden">
                              <div className="p-4 bg-muted/30 border-b space-y-3">
                                <div className="text-sm space-y-2">
                                  {sponsorship.sponsor?.phone && (
                                    <div>
                                      <span className="text-muted-foreground">الهاتف:</span>
                                      <a
                                        href={`tel:${sponsorship.sponsor.phone}`}
                                        className="mr-1 text-primary hover:underline"
                                        dir="ltr"
                                      >
                                        {sponsorship.sponsor.phone}
                                      </a>
                                    </div>
                                  )}
                                  {sponsorship.sponsor?.email && (
                                    <div>
                                      <span className="text-muted-foreground">البريد:</span>
                                      <a
                                        href={`mailto:${sponsorship.sponsor.email}`}
                                        className="mr-1 text-primary hover:underline"
                                        dir="ltr"
                                      >
                                        {sponsorship.sponsor.email}
                                      </a>
                                    </div>
                                  )}
                                  {sponsorship.notes && (
                                    <div>
                                      <span className="text-muted-foreground">ملاحظات:</span>
                                      <span className="mr-1">{sponsorship.notes}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(sponsorship)}
                                  >
                                    <Edit className="h-3 w-3 ml-1" />
                                    تعديل
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteId(sponsorship.id)}
                                  >
                                    <Trash2 className="h-3 w-3 ml-1" />
                                    حذف
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة رعاية</DialogTitle>
            <DialogDescription>
              أضف عنصر رعاية جديد لهذا الحدث
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع الرعاية *</Label>
              <Select
                value={selectedSponsorshipType}
                onValueChange={setSelectedSponsorshipType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الرعاية" />
                </SelectTrigger>
                <SelectContent>
                  {SPONSORSHIP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="selfSponsored"
                checked={isSelfSponsored}
                onCheckedChange={(checked) =>
                  setIsSelfSponsored(checked === true)
                }
              />
              <Label htmlFor="selfSponsored" className="cursor-pointer">
                رعاية ذاتية (بدون راعي خارجي)
              </Label>
            </div>

            {!isSelfSponsored && (
              <div className="space-y-2">
                <Label>اختيار الراعي</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن راعي..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9"
                  />
                </div>

                {availableSponsors && availableSponsors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    {availableSponsors.map((sponsor) => (
                      <div
                        key={sponsor.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                          selectedSponsorId === sponsor.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => setSelectedSponsorId(sponsor.id)}
                      >
                        <div className="flex items-center gap-3">
                          <SponsorLogo
                            logoUrl={sponsor.logoUrl}
                            name={sponsor.name}
                            type={sponsor.type}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{sponsor.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {getSponsorTypeLabel(sponsor.type)}
                              {sponsor.email && ` • ${sponsor.email}`}
                            </p>
                          </div>
                        </div>
                        {sponsor.sponsorshipTypes && sponsor.sponsorshipTypes.length > 0 && (
                          <div className="flex gap-1 mt-2 mr-11">
                            {sponsor.sponsorshipTypes.map((t) => (
                              <Badge
                                key={t}
                                variant="secondary"
                                className="text-xs"
                              >
                                {getSponsorshipTypeLabel(t)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedSponsorId && availableSponsors && (
                  <p className="text-sm text-primary">
                    تم اختيار:{" "}
                    {availableSponsors.find((s) => s.id === selectedSponsorId)?.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أي ملاحظات إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsAddDialogOpen(false);
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleAdd} disabled={addSponsorship.isPending}>
              {addSponsorship.isPending ? "جارٍ الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل الرعاية</DialogTitle>
            <DialogDescription>تعديل عنصر الرعاية</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع الرعاية *</Label>
              <Select
                value={selectedSponsorshipType}
                onValueChange={setSelectedSponsorshipType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الرعاية" />
                </SelectTrigger>
                <SelectContent>
                  {SPONSORSHIP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="selfSponsoredEdit"
                checked={isSelfSponsored}
                onCheckedChange={(checked) =>
                  setIsSelfSponsored(checked === true)
                }
              />
              <Label htmlFor="selfSponsoredEdit" className="cursor-pointer">
                رعاية ذاتية (بدون راعي خارجي)
              </Label>
            </div>

            {!isSelfSponsored && (
              <div className="space-y-2">
                <Label>اختيار الراعي</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن راعي..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9"
                  />
                </div>

                {availableSponsors && availableSponsors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    {availableSponsors.map((sponsor) => (
                      <div
                        key={sponsor.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                          selectedSponsorId === sponsor.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => setSelectedSponsorId(sponsor.id)}
                      >
                        <div className="flex items-center gap-3">
                          <SponsorLogo
                            logoUrl={sponsor.logoUrl}
                            name={sponsor.name}
                            type={sponsor.type}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{sponsor.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {getSponsorTypeLabel(sponsor.type)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedSponsorId && availableSponsors && (
                  <p className="text-sm text-primary">
                    تم اختيار:{" "}
                    {availableSponsors.find((s) => s.id === selectedSponsorId)?.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أي ملاحظات إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsEditDialogOpen(false);
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleEdit} disabled={updateSponsorship.isPending}>
              {updateSponsorship.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف عنصر الرعاية هذا نهائياً
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteId && deleteSponsorship.mutate({ id: deleteId })
              }
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
